import Link from 'next/link'
import VariantForm from '../VariantForm'

export default function NewVariantPage() {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
				<Link href="/admin/variants" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>
					← Варианты
				</Link>
				<h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>
					Новый вариант
				</h1>
			</div>
			<VariantForm />
		</div>
	)
}
