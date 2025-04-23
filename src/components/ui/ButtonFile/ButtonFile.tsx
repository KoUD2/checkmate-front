'use client'

import Image from 'next/image'
import React, { useState } from 'react'
import DownloadIcon from '../../../shared/images/DownloadIcon.svg'
import styles from './ButtonFile.module.css'

const ButtonFile: React.FC = () => {
	const [selectedImage, setSelectedImage] = useState<string | null>(null)

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		if (file) {
			const reader = new FileReader()
			reader.onload = () => {
				setSelectedImage(reader.result as string)
			}
			reader.readAsDataURL(file)
		}
	}

	return (
		<div className={styles['button-file']}>
			{selectedImage && (
				<div className={styles['button-file__image-container']}>
					<Image
						src={selectedImage}
						alt='Выбранное изображение'
						className={styles['button-file__image']}
						width={548}
						height={300}
					/>
				</div>
			)}

			<label className={styles['button-file__upload-button']}>
				<Image src={DownloadIcon} alt='' />
				<span className={styles['button-file__text']}>Загрузить таблицу</span>
				<input
					type='file'
					accept='image/*'
					onChange={handleFileChange}
					className={styles['button-file__input']}
				/>
			</label>
		</div>
	)
}

export default ButtonFile
