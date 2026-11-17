import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

// The link-preview image. Drawn here so it always matches the page; Latin text only,
// because the built-in font has no Greek glyphs.
export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: 'linear-gradient(135deg, #2c1436 0%, #191919 55%, #3a2408 100%)',
          color: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', paddingRight: 28, borderRight: '2px solid #4a4a4a' }}>
            <div style={{ fontSize: 64, fontWeight: 700, color: '#ff8500', lineHeight: 1 }}>Up</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#ff8500' }}>Hellas</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: 28, fontSize: 30, lineHeight: 1.2 }}>
            <div>Benefits</div>
            <div>Builder</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.1 }}>Every team is different.</div>
          <div style={{ fontSize: 38, color: '#ffce99', marginTop: 18 }}>Their benefits should be too.</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 26 }}>
          <div
            style={{
              display: 'flex',
              background: '#ff8500',
              color: '#2b1832',
              fontWeight: 700,
              padding: '14px 30px',
              borderRadius: 999,
            }}
          >
            6 questions. One plan for your team.
          </div>
          <div style={{ display: 'flex', color: '#c697ce' }}>Independent assessment</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
