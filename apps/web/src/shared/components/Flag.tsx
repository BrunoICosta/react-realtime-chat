import type { Language } from '../../core/i18n/languages'

/**
 * Inline SVG flags (flag emoji render as plain "BR"/"US" letters on Windows).
 * No clipPath/ids: the rounded corners come from the wrapper (`overflow: hidden`),
 * so any number of instances can live on the same page.
 */
export function Flag({ language }: { language: Language }) {
  return (
    <span className="flag" aria-hidden="true">
      {language === 'pt-BR' ? <BrazilFlag /> : <UsaFlag />}
    </span>
  )
}

function BrazilFlag() {
  return (
    <svg viewBox="0 0 28 20" width="28" height="20" focusable="false">
      <rect width="28" height="20" fill="#009C3B" />
      <path d="M14 2.5 25.5 10 14 17.5 2.5 10Z" fill="#FFDF00" />
      <circle cx="14" cy="10" r="4.6" fill="#002776" />
      <path d="M9.6 8.9c3-.9 6.3-.6 8.9 1.1l-.3.9c-2.5-1.6-5.6-1.9-8.4-1.1Z" fill="#fff" />
    </svg>
  )
}

const STAR_ROWS = [
  [2, 5, 8, 11],
  [3.5, 6.5, 9.5],
  [2, 5, 8, 11],
  [3.5, 6.5, 9.5],
]

function UsaFlag() {
  return (
    <svg viewBox="0 0 28 20" width="28" height="20" focusable="false">
      <rect width="28" height="20" fill="#fff" />
      <path
        d="M0 0h28M0 3.08h28M0 6.15h28M0 9.23h28M0 12.3h28M0 15.38h28M0 18.46h28"
        stroke="#B22234"
        strokeWidth="1.54"
        transform="translate(0 .77)"
      />
      <rect width="12" height="10.77" fill="#3C3B6E" />
      <g fill="#fff">
        {STAR_ROWS.flatMap((row, rowIndex) =>
          row.map((cx) => (
            <circle key={`${rowIndex}-${cx}`} cx={cx} cy={2 + rowIndex * 2} r=".6" />
          )),
        )}
      </g>
    </svg>
  )
}
