import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'

/**
 * Rend un code-barres vectoriel (SVG) à partir d'un numéro GTIN.
 * - 13 chiffres → EAN-13 (standard GS1 produit de détail)
 * - 12 chiffres → UPC-A
 * - 8 chiffres  → EAN-8
 * - sinon       → CODE128 (fallback générique)
 *
 * Le SVG est crisp à l'impression (contrairement à une image bitmap).
 */
export function Barcode({
  value,
  height = 40,
  width = 1.6,
  fontSize = 12,
  displayValue = true,
}: {
  value: string
  height?: number
  width?: number
  fontSize?: number
  displayValue?: boolean
}) {
  const ref = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!ref.current || !value) return
    const digits = value.replace(/\D/g, '')
    let format = 'CODE128'
    if (digits.length === 13) format = 'EAN13'
    else if (digits.length === 12) format = 'UPC'
    else if (digits.length === 8) format = 'EAN8'

    try {
      JsBarcode(ref.current, format === 'CODE128' ? value : digits, {
        format,
        height,
        width,
        fontSize,
        displayValue,
        margin: 4,
        background: '#ffffff',
        lineColor: '#000000',
      })
    } catch {
      // Numéro invalide pour le format — on tente CODE128 en dernier recours
      try {
        JsBarcode(ref.current, value, {
          format: 'CODE128', height, width, fontSize, displayValue, margin: 4,
        })
      } catch {
        /* abandon silencieux — le code-barres ne s'affiche pas */
      }
    }
  }, [value, height, width, fontSize, displayValue])

  if (!value) return null
  return <svg ref={ref} />
}
