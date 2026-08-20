/* Id dei documenti. Sta a parte perché serve sia alla demo sia a Firestore,
   e nessuno dei due deve importare l'altro. */

export function nuovoId(prefisso = 'id') {
  return `${prefisso}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}
