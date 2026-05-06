/**
 * Displays a patient's insurance information as a compact pill badge.
 * Renders nothing if obraSocial is absent.
 */
const InsuranceBadge = ({
  obraSocial,
  nroAfiliado,
  planNumber,
}: {
  obraSocial: string | null
  nroAfiliado: string | null
  planNumber: string | null
}) => {
  if (!obraSocial) return null

  return (
    <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
      {obraSocial}
      {nroAfiliado && ` · ${nroAfiliado}`}
      {planNumber && ` · ${planNumber}`}
    </span>
  )
}

export default InsuranceBadge
