import React, { useState } from 'react';

/* ─────────────────────────────────────────────────────────────────
   BRAND CONSTANTS  (SVG fallback colours only — never shown in text)
──────────────────────────────────────────────────────────────────*/
const NAVY   = '#1C2D5E';
const ORANGE = '#F47B20';
const WHITE  = '#FFFFFF';
const BODY   = '#FFFFFF';

export const CARD_W = 340;
export const CARD_H = 550;

const HEADER_H = 142;
const FOOTER_H = 110;

/* ─────────────────────────────────────────────────────────────────
   URL NORMALISER
   The branding API returns relative paths (/uploads/branding/…).
   Browser <img> src needs an absolute URL.
──────────────────────────────────────────────────────────────────*/
const API_BASE = (
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL
) || 'http://localhost:5001';

const toAbsUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
};

/* ─────────────────────────────────────────────────────────────────
   HEADER ZONE — uploaded image takes full zone; SVG fallback with
   company name/tagline from branding when no image is uploaded.
   Logo / company text is NEVER hardcoded — it comes from `branding`.
──────────────────────────────────────────────────────────────────*/
const HeaderZone = ({ imageUrl, branding }) => {
  if (imageUrl) {
    /* Custom image — fill entire header zone, no text overlay */
    return (
      <div style={{
        position:'absolute', top:0, left:0, width:'100%', height:HEADER_H,
        zIndex:2, overflow:'hidden',
      }}>
        <img
          src={imageUrl}
          alt="ID card header"
          crossOrigin="anonymous"
          style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
        />
      </div>
    );
  }

  /* SVG fallback — navy wave + company name from branding */
  const companyName = branding?.company_name || '';
  const tagline     = branding?.company_tagline || '';
  const logoUrl     = branding?.logo_url ? toAbsUrl(branding.logo_url) : null;

  return (
    <div style={{ position:'absolute', top:0, left:0, width:'100%', height:HEADER_H, zIndex:2 }}>
      {/* Navy wave background */}
      <svg
        style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', display:'block', pointerEvents:'none' }}
        viewBox="0 0 340 142"
        preserveAspectRatio="none"
        fill="none"
      >
        <path d="M0 0 H340 V128 C280 138 200 145 140 125 C80 108 40 118 0 115 Z" fill={NAVY}/>
        <path d="M0 115 C40 118 80 108 140 125 C200 145 280 138 340 128 L340 142 C280 152 200 160 140 138 C80 120 40 132 0 128 Z" fill={ORANGE}/>
      </svg>

      {/* Company branding — left-aligned, on top of SVG */}
      <div style={{
        position:'absolute', top:0, left:0, zIndex:10,
        display:'flex', alignItems:'center', gap:10,
        padding:'18px 0 0 20px', pointerEvents:'none',
      }}>
        {/* Company logo if available, else a neutral placeholder block */}
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={companyName}
            crossOrigin="anonymous"
            style={{ width:42, height:36, objectFit:'contain', flexShrink:0 }}
          />
        ) : (
          /* Generic icon placeholder — no KOSQU-specific SVG */
          <div style={{
            width:42, height:36, borderRadius:6,
            background:'rgba(255,255,255,0.18)',
            display:'flex', alignItems:'center', justifyContent:'center',
            flexShrink:0,
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={WHITE} strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2"/>
              <path d="M16 7V5a2 2 0 0 0-4 0v2"/>
              <path d="M8 7V5a2 2 0 0 1 4 0v2"/>
            </svg>
          </div>
        )}

        {/* Company name + tagline from branding */}
        <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
          {companyName ? (
            <span style={{
              fontSize:'1.25rem', fontWeight:900, color:WHITE,
              lineHeight:1, letterSpacing:'0.08em',
              fontFamily:'"Segoe UI",Arial,sans-serif',
              textTransform:'uppercase',
            }}>
              {companyName}
            </span>
          ) : null}
          {tagline ? (
            <span style={{
              fontSize:'0.38rem', fontWeight:700,
              color:'rgba(255,255,255,0.75)',
              letterSpacing:'0.20em', textTransform:'uppercase',
              fontFamily:'"Segoe UI",Arial,sans-serif',
            }}>
              {tagline}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   FOOTER ZONE — uploaded image OR SVG fallback (mirror of header)
──────────────────────────────────────────────────────────────────*/
const FooterZone = ({ imageUrl }) => {
  if (imageUrl) {
    return (
      <div style={{
        position:'absolute', bottom:0, left:0, width:'100%', height:FOOTER_H,
        zIndex:2, overflow:'hidden',
      }}>
        <img
          src={imageUrl}
          alt="ID card footer"
          crossOrigin="anonymous"
          style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
        />
      </div>
    );
  }
  return (
    <svg
      style={{ position:'absolute', bottom:0, left:0, width:'100%', height:FOOTER_H, zIndex:2, display:'block', pointerEvents:'none' }}
      viewBox="0 0 340 110"
      preserveAspectRatio="none"
      fill="none"
    >
      <path d="M0 110 H340 V32 C280 22 200 15 140 35 C80 52 40 42 0 45 Z" fill={NAVY}/>
      <path d="M0 45 C40 42 80 52 140 35 C200 15 280 22 340 32 L340 18 C280 8 200 0 140 20 C80 38 40 28 0 31 Z" fill={ORANGE}/>
    </svg>
  );
};

/* ─────────────────────────────────────────────────────────────────
   CARD FRONT
──────────────────────────────────────────────────────────────────*/
const CardFront = ({ cardData, photoUrl, headerUrl, footerUrl, branding }) => {
  const initials    = `${cardData?.first_name?.[0]||''}${cardData?.last_name?.[0]||''}`.toUpperCase() || '?';
  const fullName    = `${cardData?.first_name||''} ${cardData?.last_name||''}`.trim().toUpperCase() || 'EMPLOYEE NAME';
  const designation = (cardData?.position || 'Employee').toUpperCase();
  const empId       = cardData?.emp_number || cardData?.employee_id || '—';
  const email       = cardData?.email || '—';
  const phone       = cardData?.phone || '—';

  return (
    <div style={{
      width:CARD_W, height:CARD_H,
      position:'relative', overflow:'hidden',
      background:BODY,
      borderRadius:16,
      boxShadow:'0 8px 32px rgba(28,45,94,0.20)',
      fontFamily:'"Segoe UI",Inter,Arial,sans-serif',
      flexShrink:0,
    }}>
      <HeaderZone imageUrl={headerUrl} branding={branding}/>

      <div style={{
        position:'absolute',
        top:HEADER_H, left:0, right:0, bottom:FOOTER_H,
        display:'flex', flexDirection:'column', alignItems:'center',
        padding:'16px 0 0',
        zIndex:5, overflow:'hidden',
      }}>
        {/* Profile photo */}
        <div style={{
          width:108, height:108, borderRadius:'50%',
          border:`4px solid ${WHITE}`,
          outline:`3px solid ${NAVY}`,
          overflow:'hidden', background:'#dde3f0',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 4px 18px rgba(28,45,94,0.22)',
          fontSize:34, fontWeight:800, color:NAVY,
          flexShrink:0,
        }}>
          {photoUrl
            ? <img src={photoUrl} alt="profile" style={{ width:'100%', height:'100%', objectFit:'cover' }} crossOrigin="anonymous"/>
            : initials}
        </div>

        {/* Name */}
        <div style={{
          marginTop:12, color:NAVY,
          fontWeight:800, fontSize:17,
          letterSpacing:'0.04em', textTransform:'uppercase',
          textAlign:'center', padding:'0 14px', lineHeight:1.2,
        }}>
          {fullName}
        </div>

        {/* Designation */}
        <div style={{
          color:ORANGE, fontSize:9.5, fontWeight:700,
          textTransform:'uppercase', letterSpacing:'0.16em',
          marginTop:4, textAlign:'center',
        }}>
          {designation}
        </div>

        {/* Divider */}
        <div style={{ width:'80%', height:1, background:'#e2e8f0', margin:'12px 0 10px' }}/>

        {/* Details grid */}
        <div style={{
          width:'100%', padding:'0 28px',
          display:'grid', gridTemplateColumns:'50px 10px 1fr',
          rowGap:10, fontSize:11.5, color:NAVY,
        }}>
          {[['ID No', empId], ['E-mail', email], ['Phone', phone]].map(([lbl, val]) => (
            <React.Fragment key={lbl}>
              <div style={{ fontWeight:700 }}>{lbl}</div>
              <div style={{ fontWeight:700 }}>:</div>
              <div style={{ fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{val}</div>
            </React.Fragment>
          ))}
        </div>
      </div>

      <FooterZone imageUrl={footerUrl}/>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   CARD BACK
──────────────────────────────────────────────────────────────────*/
const CardBack = ({ address, website, headerUrl, footerUrl, branding }) => (
  <div style={{
    width:CARD_W, height:CARD_H,
    position:'relative', overflow:'hidden',
    background:BODY,
    borderRadius:16,
    boxShadow:'0 8px 32px rgba(28,45,94,0.20)',
    fontFamily:'"Segoe UI",Inter,Arial,sans-serif',
    flexShrink:0,
  }}>
    <HeaderZone imageUrl={headerUrl} branding={branding}/>

    <div style={{
      position:'absolute',
      top:HEADER_H, left:0, right:0, bottom:FOOTER_H,
      padding:'16px 26px 0',
      zIndex:5, overflow:'hidden',
    }}>
      <h2 style={{
        textAlign:'left', color:NAVY, fontWeight:900,
        fontSize:14, letterSpacing:'0.04em', margin:'0 0 14px 0',
        textTransform:'uppercase',
      }}>
        TERMS &amp; CONDITIONS
      </h2>

      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {[
          ['Identification', 'All employees must keep their ID cards visible or readily available while on company premises to ensure proper access control and identity verification.'],
          ['Usage', 'The ID card remains the exclusive property of the company. It is issued for personal use only and must not be lent, copied, or misused in any manner.'],
        ].map(([title, text]) => (
          <div key={title} style={{ display:'flex', gap:9, alignItems:'flex-start' }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:NAVY, marginTop:4, flexShrink:0 }}/>
            <div style={{ fontSize:10.5, color:'#1e293b', lineHeight:1.58, textAlign:'justify' }}>
              <span style={{ fontWeight:700, color:NAVY }}>{title}: </span>{text}
            </div>
          </div>
        ))}
      </div>

      {address && (
        <div style={{ display:'flex', gap:7, marginTop:18, alignItems:'flex-start' }}>
          <svg width="13" height="14" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0, marginTop:2 }}>
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <div style={{ fontSize:10, color:'#334155', fontWeight:500, lineHeight:1.55 }}>{address}</div>
        </div>
      )}

      {website && (
        <div style={{ textAlign:'center', marginTop:12 }}>
          <span style={{ fontSize:11, fontWeight:700, color:NAVY }}>{website}</span>
        </div>
      )}
    </div>

    <FooterZone imageUrl={footerUrl}/>
  </div>
);

/* ─────────────────────────────────────────────────────────────────
   PRINT HTML BUILDER
   All branding text and images come from the `branding` object.
   No company-specific strings are hardcoded here.
──────────────────────────────────────────────────────────────────*/
export const buildIDCardPrintHtml = (cardData, photoUrl, branding = {}) => {
  const fullName    = `${cardData?.first_name||''} ${cardData?.last_name||''}`.trim().toUpperCase() || 'EMPLOYEE NAME';
  const designation = (cardData?.position || 'Employee').toUpperCase();
  const empId       = cardData?.emp_number || cardData?.employee_id || '—';
  const email       = cardData?.email || '—';
  const phone       = cardData?.phone || '—';
  const initials    = `${cardData?.first_name?.[0]||''}${cardData?.last_name?.[0]||''}`.toUpperCase() || '?';
  const address     = branding.company_address || '';
  const website     = branding.company_website || '';
  const companyName = branding.company_name || '';
  const tagline     = branding.company_tagline || '';
  const logoUrl     = branding.logo_url ? toAbsUrl(branding.logo_url) : null;
  const headerUrl   = branding.idcard_header_url ? toAbsUrl(branding.idcard_header_url) : null;
  const footerUrl   = branding.idcard_footer_url ? toAbsUrl(branding.idcard_footer_url) : null;

  /* Header HTML */
  const logoImg = logoUrl
    ? `<img src="${logoUrl}" crossorigin="anonymous" style="width:42px;height:36px;object-fit:contain;flex-shrink:0"/>`
    : `<div style="width:42px;height:36px;border-radius:6px;background:rgba(255,255,255,0.18);display:flex;align-items:center;justify-content:center;flex-shrink:0"></div>`;

  const fallbackHeaderContent = `
    <svg style="position:absolute;top:0;left:0;width:100%;height:100%;display:block;pointer-events:none"
      viewBox="0 0 340 142" preserveAspectRatio="none" fill="none">
      <path d="M0 0 H340 V128 C280 138 200 145 140 125 C80 108 40 118 0 115 Z" fill="${NAVY}"/>
      <path d="M0 115 C40 118 80 108 140 125 C200 145 280 138 340 128 L340 142 C280 152 200 160 140 138 C80 120 40 132 0 128 Z" fill="${ORANGE}"/>
    </svg>
    <div style="position:absolute;top:0;left:0;z-index:10;display:flex;align-items:center;gap:10px;padding:18px 0 0 20px;pointer-events:none">
      ${logoImg}
      <div style="display:flex;flex-direction:column;gap:2px">
        ${companyName ? `<span style="font-size:1.25rem;font-weight:900;color:${WHITE};line-height:1;letter-spacing:0.08em;font-family:Segoe UI,Arial,sans-serif;text-transform:uppercase">${companyName}</span>` : ''}
        ${tagline ? `<span style="font-size:0.38rem;font-weight:700;color:rgba(255,255,255,0.75);letter-spacing:0.20em;text-transform:uppercase;font-family:Segoe UI,Arial,sans-serif">${tagline}</span>` : ''}
      </div>
    </div>`;

  const headerHtml = headerUrl
    ? `<div style="position:absolute;top:0;left:0;width:100%;height:${HEADER_H}px;z-index:2;overflow:hidden"><img src="${headerUrl}" crossorigin="anonymous" style="width:100%;height:100%;object-fit:cover;display:block"/></div>`
    : `<div style="position:absolute;top:0;left:0;width:100%;height:${HEADER_H}px;z-index:2;overflow:hidden;position:relative">${fallbackHeaderContent}</div>`;

  const footerHtml = footerUrl
    ? `<div style="position:absolute;bottom:0;left:0;width:100%;height:${FOOTER_H}px;z-index:2;overflow:hidden"><img src="${footerUrl}" crossorigin="anonymous" style="width:100%;height:100%;object-fit:cover;display:block"/></div>`
    : `<svg style="position:absolute;bottom:0;left:0;width:100%;height:${FOOTER_H}px;z-index:2;display:block;pointer-events:none" viewBox="0 0 340 110" preserveAspectRatio="none" fill="none"><path d="M0 110 H340 V32 C280 22 200 15 140 35 C80 52 40 42 0 45 Z" fill="${NAVY}"/><path d="M0 45 C40 42 80 52 140 35 C200 15 280 22 340 32 L340 18 C280 8 200 0 140 20 C80 38 40 28 0 31 Z" fill="${ORANGE}"/></svg>`;

  const cardBase = `width:${CARD_W}px;height:${CARD_H}px;position:relative;overflow:hidden;background:${BODY};border-radius:16px;box-shadow:0 8px 32px rgba(28,45,94,0.20);font-family:'Segoe UI',Inter,Arial,sans-serif;flex-shrink:0`;
  const bodyBase = `position:absolute;top:${HEADER_H}px;left:0;right:0;bottom:${FOOTER_H}px;display:flex;flex-direction:column;align-items:center;padding:16px 0 0;z-index:5;overflow:hidden`;

  const fields = [['ID No',empId],['E-mail',email],['Phone',phone]].map(([lbl,val]) =>
    `<div style="font-weight:700">${lbl}</div><div style="font-weight:700">:</div><div style="font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${val}</div>`
  ).join('');

  const front = `<div style="${cardBase}">
    ${headerHtml}
    <div style="${bodyBase}">
      <div style="width:108px;height:108px;border-radius:50%;border:4px solid ${WHITE};outline:3px solid ${NAVY};overflow:hidden;background:#dde3f0;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 18px rgba(28,45,94,0.22);font-size:34px;font-weight:800;color:${NAVY};flex-shrink:0">
        ${photoUrl ? `<img src="${photoUrl}" style="width:100%;height:100%;object-fit:cover" crossorigin="anonymous">` : initials}
      </div>
      <div style="margin-top:12px;color:${NAVY};font-weight:800;font-size:17px;letter-spacing:0.04em;text-transform:uppercase;text-align:center;padding:0 14px;line-height:1.2">${fullName}</div>
      <div style="color:${ORANGE};font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.16em;margin-top:4px;text-align:center">${designation}</div>
      <div style="width:80%;height:1px;background:#e2e8f0;margin:12px 0 10px"></div>
      <div style="width:100%;padding:0 28px;display:grid;grid-template-columns:50px 10px 1fr;row-gap:10px;font-size:11.5px;color:${NAVY}">${fields}</div>
    </div>
    ${footerHtml}
  </div>`;

  const tcItems = [
    ['Identification','All employees must keep their ID cards visible or readily available while on company premises to ensure proper access control and identity verification.'],
    ['Usage','The ID card remains the exclusive property of the company. It is issued for personal use only and must not be lent, copied, or misused in any manner.'],
  ].map(([t,tx]) =>
    `<div style="display:flex;gap:9px;align-items:flex-start"><div style="width:6px;height:6px;border-radius:50%;background:${NAVY};margin-top:4px;flex-shrink:0"></div><div style="font-size:10.5px;color:#1e293b;line-height:1.58;text-align:justify"><span style="font-weight:700;color:${NAVY}">${t}: </span>${tx}</div></div>`
  ).join('');

  const back = `<div style="${cardBase}">
    ${headerHtml}
    <div style="position:absolute;top:${HEADER_H}px;left:0;right:0;bottom:${FOOTER_H}px;padding:16px 26px 0;z-index:5;overflow:hidden">
      <h2 style="text-align:left;color:${NAVY};font-weight:900;font-size:14px;letter-spacing:0.04em;margin:0 0 14px 0;text-transform:uppercase">TERMS &amp; CONDITIONS</h2>
      <div style="display:flex;flex-direction:column;gap:12px">${tcItems}</div>
      ${address ? `<div style="display:flex;gap:7px;margin-top:18px;align-items:flex-start"><svg width="13" height="14" viewBox="0 0 24 24" fill="none" stroke="${NAVY}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:2px"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg><div style="font-size:10px;color:#334155;font-weight:500;line-height:1.55">${address}</div></div>` : ''}
      ${website ? `<div style="text-align:center;margin-top:12px"><span style="font-size:11px;font-weight:700;color:${NAVY}">${website}</span></div>` : ''}
    </div>
    ${footerHtml}
  </div>`;

  const title = companyName ? `${companyName} ID Card` : 'Employee ID Card';
  return `<!DOCTYPE html><html><head><title>${title}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#d8dee8;display:flex;align-items:center;justify-content:center;gap:32px;min-height:100vh;padding:24px}
  .pb{position:fixed;top:16px;right:16px;padding:9px 22px;background:${NAVY};color:#fff;border:none;border-radius:8px;cursor:pointer;font:700 13px/1 'Segoe UI',sans-serif;z-index:99;letter-spacing:.03em}
  @media print{body{background:#fff;gap:18px}.pb{display:none}}
</style>
</head><body>
<button class="pb" onclick="window.print()">Print Both Sides</button>
${front}${back}
</body></html>`;
};

/* ─────────────────────────────────────────────────────────────────
   MAIN EXPORTED COMPONENT
   Props:
     cardData  — employee record from API
     photoUrl  — absolute URL to employee profile photo
     branding  — full tenant_branding object from /api/branding
                 Fields used: idcard_header_url, idcard_footer_url,
                 logo_url, company_name, company_tagline,
                 company_address, company_website
   URL normalisation is done here — callers can pass relative paths.
──────────────────────────────────────────────────────────────────*/
const IDCardTemplate = ({ cardData, photoUrl, branding = {} }) => {
  const [showBack, setShowBack] = useState(false);

  /* Normalise all image URLs to absolute so <img> always resolves */
  const headerUrl = toAbsUrl(branding.idcard_header_url);
  const footerUrl = toAbsUrl(branding.idcard_footer_url);

  const handlePrint = () => {
    const pw = window.open('', '_blank', `width=800,height=${CARD_H + 150}`);
    pw.document.write(buildIDCardPrintHtml(cardData, photoUrl, branding));
    pw.document.close();
    pw.focus();
    setTimeout(() => pw.print(), 500);
  };

  return (
    <div>
      {/* Controls */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        <div style={{ display:'flex', background:'var(--theme-bg-muted,#f1f5f9)', borderRadius:8, padding:2, gap:1 }}>
          {['Front','Back'].map(side => {
            const active = showBack ? side === 'Back' : side === 'Front';
            return (
              <button key={side} onClick={() => setShowBack(side === 'Back')}
                style={{
                  padding:'5px 14px', borderRadius:6, border:'none',
                  fontWeight:700, fontSize:11, cursor:'pointer',
                  background: active ? NAVY : 'transparent',
                  color: active ? WHITE : 'var(--theme-text-muted,#64748b)',
                  transition:'background .18s,color .18s',
                }}>
                {side}
              </button>
            );
          })}
        </div>
        <button onClick={handlePrint}
          style={{
            padding:'7px 16px', borderRadius:9, border:'none',
            background:`linear-gradient(135deg,${NAVY},#2a4a8a)`,
            color:WHITE, fontWeight:700, fontSize:12, cursor:'pointer',
          }}>
          Print
        </button>
      </div>

      {/* Card preview */}
      <div style={{ display:'flex', justifyContent:'center' }}>
        {showBack
          ? <CardBack
              address={branding.company_address || ''}
              website={branding.company_website || ''}
              headerUrl={headerUrl}
              footerUrl={footerUrl}
              branding={branding}
            />
          : <CardFront
              cardData={cardData}
              photoUrl={photoUrl}
              headerUrl={headerUrl}
              footerUrl={footerUrl}
              branding={branding}
            />
        }
      </div>
    </div>
  );
};

export default IDCardTemplate;
