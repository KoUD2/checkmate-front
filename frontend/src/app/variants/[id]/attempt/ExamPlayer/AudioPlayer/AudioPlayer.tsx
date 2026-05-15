'use client'

import { useRef } from 'react'
import styles from './AudioPlayer.module.css'

interface Props {
	audioUrl: string
	playCount: number
	onPlay: () => void | Promise<void>
	disabled: boolean
}

export default function AudioPlayer({ audioUrl, playCount, onPlay, disabled }: Props) {
	const audioRef = useRef<HTMLAudioElement | null>(null)

	const canPlay = playCount < 2 && !disabled

	const handleClick = async () => {
		if (!canPlay) return
		await onPlay()
		audioRef.current?.play().catch(() => {
			// autoplay blocked or other browser error — silent
		})
	}

	return (
		<div className={styles.audioPlayer}>
			<div className={styles.audioControls}>
				<button
					type="button"
					className={canPlay ? styles.playBtn : styles.playBtnDisabled}
					disabled={!canPlay}
					onClick={handleClick}
				>
					Воспроизвести
				</button>
				<span className={styles.playCount}>Воспроизведено: {playCount}/2</span>
			</div>
			<audio ref={audioRef} src={audioUrl} preload="auto" />
		</div>
	)
}
