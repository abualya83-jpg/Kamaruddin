import { Link } from 'react-router-dom'
import { Printer } from 'lucide-react'
import CrudPage from '../components/CrudPage'
import { moduleByKey } from '../modules'

export default function OprPage() {
  const config = moduleByKey.opr
  return (
    <CrudPage config={config} rowActions={(row) => (
      <Link to={`${config.path}/${row.id}/cetak`} title="Cetak / PDF" aria-label="Cetak"
        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-teal-700">
        <Printer size={16} />
      </Link>
    )} />
  )
}
