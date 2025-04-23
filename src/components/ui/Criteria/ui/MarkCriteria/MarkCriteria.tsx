'use client'

import cn from 'classnames'
import Image from 'next/image'
import { JSX, useState } from 'react'
import ArrowDown from '../../../../../shared/images/ArrowDown.svg'
import styles from './MarkCriteria.module.css'
import { IMarkCriteria } from './MarkCriteria.props'

const MarkCriteria = ({
	withK,
	maxMark,
	onMarkChange,
	...props
}: IMarkCriteria): JSX.Element => {
	const [isOpen, setIsOpen] = useState(false)
	const [selectedMark, setSelectedMark] = useState(withK ? '0' : 'К1')

	console.log(withK)

	const marks = withK
		? Array.from({ length: maxMark + 1 }, (_, i) => `${i}`)
		: Array.from({ length: maxMark }, (_, i) => `K${i + 1}`)

	const handleMarkSelect = (mark: string) => {
		setSelectedMark(mark)
		setIsOpen(false)
		onMarkChange?.(mark)
	}

	return (
		<div
			className={cn(styles['mark-criteria'], {
				[styles['mark-criteria_isOpen']]: isOpen,
			})}
			{...props}
		>
			<button
				type='button'
				className={styles['mark-criteria__button']}
				onClick={e => {
					e.stopPropagation()
					setIsOpen(!isOpen)
				}}
			>
				<h3 className={styles['mark-criteria__selected-mark']}>
					{selectedMark}
				</h3>
				<Image
					src={ArrowDown}
					alt='Критерии оценки'
					className={cn(styles['mark-criteria__arrow'], {
						[styles['mark-criteria__arrow_isOpen']]: isOpen,
					})}
				/>
			</button>
			{isOpen && (
				<ul
					className={styles['mark-criteria__dropdown']}
					onClick={e => e.stopPropagation()}
				>
					{marks
						.filter(mark => mark !== selectedMark)
						.map(mark => (
							<li
								key={mark}
								className={styles['mark-criteria__dropdown-item']}
								onClick={() => handleMarkSelect(mark)}
							>
								{mark}
							</li>
						))}
				</ul>
			)}
		</div>
	)
}

export default MarkCriteria
