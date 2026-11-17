import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

const allowed = {
  company_size: ['1-9','10-49','50-249','250-999','1000+'],
  industry: ['technology','services','retail','manufacturing','hospitality','other'],
  work_model: ['office','hybrid','remote'],
  goal: ['retention','wellbeing','tax','expenses','daily'],
  current_benefits: ['meal','flex','wellbeing','rewards','expenses','none'],
  budget: ['under50','50to99','100to199','200plus','unsure'],
} as const;
const keys = Object.keys(allowed) as (keyof typeof allowed)[];
const freeEmails = new Set(['gmail.com','googlemail.com','yahoo.com','yahoo.gr','hotmail.com','hotmail.gr','outlook.com','outlook.gr','live.com','icloud.com','aol.com','proton.me','protonmail.com','gmx.com','mail.com']);
const validString = (v: unknown, min:number, max:number) => typeof v==='string' && v.trim().length >= min && v.trim().length<=max && !/[<>\u0000-\u001f\u007f]/.test(v);
const isObj = (v:unknown):v is Record<string,unknown> => !!v && typeof v==='object' && !Array.isArray(v);
function verify(input: unknown) {
  if (!isObj(input) || input.honeypot || input.dummy_data!==true || input.consent!==true || !['el','en'].includes(String(input.language))) throw Error('invalid_form');
  if (typeof input.submission_id!=='string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.submission_id)) throw Error('invalid_submission');
  if(!isObj(input.answers)||Object.keys(input.answers).length!==keys.length||!isObj(input.lead)) throw Error('invalid_payload');
  for(const key of keys){
    const val=input.answers[key];
    if(key==='current_benefits') {
      if(!Array.isArray(val)||!val.length||val.length>6||new Set(val).size!==val.length||val.some(x=>!allowed.current_benefits.includes(x))||(val.includes('none')&&val.length>1))throw Error('invalid_benefits');
    } else if(typeof val!=='string'||!(allowed[key] as readonly string[]).includes(val)) throw Error('invalid_answer');
  }
  for(const key of ['name','company'] as const) if(!validString(input.lead[key],2,key==='name'?80:120))throw Error('invalid_lead');
  const email=String(input.lead.email||'').toLowerCase().trim();
  if(email.length>254||!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(email))throw Error('invalid_email');
  const [local,domain]=email.split('@');
  if(local.length>64||local.startsWith('.')||local.endsWith('.')||local.includes('..'))throw Error('invalid_email');
  if(!(/(^|\.)example\.(com|org|net)$/.test(domain)||/\.(example|test|invalid)$/.test(domain)||['upb.assessment.demo@gmail.com','upb.assessment.demo@yahoo.com'].includes(email)))throw Error('dummy_email_only');
  const phone=String(input.lead.phone||'').trim();
  if(phone && (!/^\+?[\d ()-]+$/.test(phone)||phone.replace(/\D/g,'').length<8||phone.replace(/\D/g,'').length>15||(!/^\+?30[ ()-]*0[0 ()-]*$/.test(phone)&&!/^0[0 ()-]{7,}$/.test(phone))))throw Error('dummy_phone_only');
  return { submission_id:input.submission_id,language:input.language,answers:input.answers, lead:{name:String(input.lead.name).trim(),company:String(input.lead.company).trim(),email,phone}, email_domain:domain,free_email:freeEmails.has(domain),consent:true,dummy_data:true,received_at:new Date().toISOString() };
}

export async function POST(request: Request) {
  // LEAD_WEBHOOK_URL is the automation webhook (Make). The N8N_* names are kept as a fallback for older deployments.
  const webhookUrl = process.env.LEAD_WEBHOOK_URL || process.env.N8N_LEAD_WEBHOOK_URL;
  const webhookSecret = process.env.LEAD_WEBHOOK_SECRET || process.env.N8N_WEBHOOK_SECRET;
  if(!webhookUrl) return NextResponse.json({ok:false,error:'workflow_not_configured'}, {status:503});
  let validated: ReturnType<typeof verify>;
  try{
    if(Number(request.headers.get('content-length')||0)>16000)return NextResponse.json({ok:false,error:'payload_too_large'},{status:413});
    validated=verify(await request.json());
  }catch{return NextResponse.json({ok:false,error:'invalid_or_non_dummy_data'},{status:400});}
  try {
    const url=new URL(webhookUrl);
    if(url.protocol!=='https:') throw Error('webhook_requires_https');
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),18000);
    let upstream:Response;
    try{
      upstream=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...(webhookSecret?{'Authorization':`Bearer ${webhookSecret}`}:{})},body:JSON.stringify(validated),signal:controller.signal,cache:'no-store'});
    }finally{clearTimeout(timeout);}
    const data=await upstream.json().catch(()=>null);
    // Show saved only with an explicit verified receipt. Workflow should return recommendations and approved summary.
    if(!upstream.ok || !isObj(data)||data.ok!==true||data.persisted!==true||data.submission_id!==validated.submission_id || !isObj(data.recommendations) || !Array.isArray(data.recommendations.primary) || !data.recommendations.primary.length || typeof data.summary!=='string')throw Error('bad_upstream_receipt');
    const products=new Set(['flexone','upgift','fitpass','upexpense','cheque']);
    if(data.recommendations.primary.some((p:unknown)=>!isObj(p)||!products.has(String(p.id))))throw Error('invalid_recommendations');
    return NextResponse.json({ok:true,persisted:true,submission_id:validated.submission_id,recommendations:data.recommendations,summary:data.summary,summary_mode:data.summary_mode==='llm_validated'?'llm_validated':'rules_fallback'});
  }catch{return NextResponse.json({ok:false,error:'save_not_confirmed'},{status:502});}
}
