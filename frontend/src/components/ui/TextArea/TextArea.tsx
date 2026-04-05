'use client'

import cn from 'classnames'
import Image from 'next/image'
import { FC, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import messagePart from '../../../shared/images/messagePart.svg'
import MarkCriteria from '../Criteria/ui/MarkCriteria/MarkCriteria'
import styles from './TextArea.module.css'

const globalStyles = `
  .orange-highlight {
    background-color: #f7e9e5 !important;
    color: #eb5931 !important;
    padding: 2px 0;
    border-radius: 3px;
    display: inline;
    white-space: pre-wrap;
  }
`

interface ITextArea {
	value: string
	onChange?: (value: string) => void
	className?: string
	placeholder?: string
	onMarkChange?: (mark: string) => void
	readOnly?: boolean
	isCommentable?: boolean
	htmlContent?: string
	onCommentAdd?: (comment: {
		criterion: string
		text: string
		start_pos: number
		end_pos: number
	}) => void
}

type SavedSelectionType = {
	selectedText: string
	selectionPosition: number
	visualTop: number
	visualLeft: number
	textBefore?: string
	textAfter?: string
}

const TextArea: FC<ITextArea> = ({
	value,
	onChange,
	className,
	placeholder,
	onMarkChange,
	onCommentAdd,
	readOnly = false,
	isCommentable = false,
	htmlContent,
}) => {
	const textAreaRef = useRef<HTMLTextAreaElement>(null)
	const commentPopupRef = useRef<HTMLDivElement>(null)
	const divRef = useRef<HTMLDivElement>(null)
	const [commentText, setCommentText] = useState('')
	const [selectedCriterion, setSelectedCriterion] = useState('К1')

	const [savedSelection, setSavedSelection] =
		useState<SavedSelectionType | null>(null)
	const [commentPos, setCommentPos] = useState<{
		top: number
		left: number
	} | null>(null)
	const [showCommentInput, setShowCommentInput] = useState(false)
	const [content, setContent] = useState('')

	const getTextNodesIn = useCallback((node: Node): Text[] => {
		const textNodes: Text[] = []
		if (node.nodeType === Node.TEXT_NODE) {
			textNodes.push(node as Text)
		} else {
			const children = node.childNodes
			for (let i = 0; i < children.length; i++) {
				textNodes.push(...getTextNodesIn(children[i]))
			}
		}
		return textNodes
	}, [])

	const updateContent = useCallback(() => {
		setContent(htmlContent || value.replace(/\n/g, '<br/>'))
	}, [htmlContent, value])

	const handleMarkSelect = (mark: string) => {
		setSelectedCriterion(mark)
		onMarkChange?.(mark)
	}

	useEffect(updateContent, [updateContent])

	const handleClickOutside = useCallback((e: MouseEvent) => {
		const target = e.target as Node
		const popup = commentPopupRef.current
		const editor = divRef.current

		const isOutsidePopup = popup && !popup.contains(target)
		const isOutsideEditor = editor && !editor.contains(target)

		if (isOutsidePopup && isOutsideEditor) {
			setShowCommentInput(false)
		}
	}, [])

	const handleMouseUp = useCallback(() => {
		if (!isCommentable || !divRef.current) return

		const selection = window.getSelection()
		if (!selection || selection.toString().trim() === '') return

		const range = selection.getRangeAt(0)
		const selectedText = range.toString()
		if (!selectedText || selectedText.trim() === '') return

		const rect = range.getBoundingClientRect()
		const divRect = divRef.current.getBoundingClientRect()
		const relativePos = {
			top: rect.top - divRect.top,
			left: rect.left - divRect.left,
		}

		let selectionPosition = -1
		let textBefore = ''
		let textAfter = ''

		const uniqueMarker = `__SEL_${Date.now()}__`

		try {
			const markerRange = range.cloneRange()
			const markerNode = document.createTextNode(uniqueMarker)
			markerRange.collapse(true)
			markerRange.insertNode(markerNode)

			const htmlWithMarker = divRef.current.innerHTML
			const markerPosition = htmlWithMarker.indexOf(uniqueMarker)
			markerNode.remove()

			if (markerPosition !== -1) {
				const htmlBeforeMarker = htmlWithMarker.substring(0, markerPosition)
				const tempDiv = document.createElement('div')
				tempDiv.innerHTML = htmlBeforeMarker
				const textBeforeSelection = tempDiv.textContent || ''
				selectionPosition = textBeforeSelection.length

				const CONTEXT_SIZE = 30
				const fullText = divRef.current.textContent || ''
				textBefore = fullText.substring(
					Math.max(0, selectionPosition - CONTEXT_SIZE),
					selectionPosition
				)
				textAfter = fullText.substring(
					selectionPosition + selectedText.length,
					Math.min(fullText.length, selectionPosition + selectedText.length + CONTEXT_SIZE)
				)
			}
		} catch {
			// ignore marker errors
		}

		if (selectionPosition === -1) {
			const fullText = divRef.current.textContent || ''
			const allMatches = findAllOccurrences(fullText, selectedText)
			if (allMatches.length === 1) {
				selectionPosition = allMatches[0]
				const CONTEXT_SIZE = 30
				textBefore = fullText.substring(Math.max(0, selectionPosition - CONTEXT_SIZE), selectionPosition)
				textAfter = fullText.substring(
					selectionPosition + selectedText.length,
					Math.min(fullText.length, selectionPosition + selectedText.length + CONTEXT_SIZE)
				)
			}
		}

		setSavedSelection({
			selectedText,
			selectionPosition,
			visualTop: relativePos.top,
			visualLeft: relativePos.left,
			textBefore,
			textAfter,
		})

		setCommentPos({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX })
		setShowCommentInput(true)
	}, [isCommentable])

	const findAllOccurrences = (text: string, searchString: string): number[] => {
		const positions: number[] = []
		let position = text.indexOf(searchString)
		while (position !== -1) {
			positions.push(position)
			position = text.indexOf(searchString, position + 1)
		}
		return positions
	}

	useEffect(() => {
		const observer = new MutationObserver(mutations => {
			if (divRef.current && mutations.length > 0) {
				setContent(divRef.current.innerHTML)
			}
		})
		if (divRef.current) {
			observer.observe(divRef.current, {
				childList: true,
				subtree: true,
				characterData: true,
				attributes: true,
			})
		}
		return () => observer.disconnect()
	}, [])

	useEffect(() => {
		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [handleClickOutside])

	const handleAddComment = useCallback(() => {
		try {
			if (!savedSelection || !divRef.current) {
				setShowCommentInput(false)
				return
			}

			const { selectedText, selectionPosition, visualTop, visualLeft, textBefore, textAfter } = savedSelection
			const fullText = divRef.current.textContent || ''
			const positions = findAllOccurrences(fullText, selectedText)
			const start_pos = fullText.indexOf(savedSelection.selectedText)
			const end_pos = start_pos + savedSelection.selectedText.length

			onCommentAdd?.({
				criterion: selectedCriterion,
				text: commentText.trim(),
				start_pos,
				end_pos,
			})

			if (positions.length === 0) {
				setCommentText('')
				setShowCommentInput(false)
				return
			}

			const textNodes = getTextNodesIn(divRef.current)

			const isWordBoundary = (char: string | undefined) => {
				if (!char) return true
				return /\s|[.,;!?()\[\]{}""]/g.test(char)
			}

			type Match = {
				position: number
				visualDistance?: number
				contextScore: number
				node?: Text
				startOffset?: number
				isExactPositionMatch?: boolean
				isWordBoundary?: boolean
			}

			const matches: Match[] = positions.map(position => {
				const match: Match = { position, contextScore: 0 }
				match.isExactPositionMatch = position === selectionPosition
				const charBefore = fullText[position - 1]
				const charAfter = fullText[position + selectedText.length]
				match.isWordBoundary = isWordBoundary(charBefore) && isWordBoundary(charAfter)

				try {
					let currentPos = 0
					for (let i = 0; i < textNodes.length; i++) {
						const node = textNodes[i]
						const nodeLength = node.textContent?.length || 0
						if (currentPos <= position && currentPos + nodeLength > position) {
							match.node = node
							match.startOffset = position - currentPos
							const tempRange = document.createRange()
							tempRange.setStart(node, match.startOffset)
							const endOffset = Math.min(match.startOffset + selectedText.length, nodeLength)
							tempRange.setEnd(node, endOffset)
							const rect = tempRange.getBoundingClientRect()
							const divRect = divRef.current?.getBoundingClientRect()
							if (divRect) {
								const top = rect.top - divRect.top
								const left = rect.left - divRect.left
								match.visualDistance = Math.sqrt(Math.pow(top - visualTop, 2) + Math.pow(left - visualLeft, 2))
							}
							break
						}
						currentPos += nodeLength
					}
				} catch {
					// ignore
				}

				if (textBefore && textAfter) {
					const CONTEXT_SIZE = textBefore.length
					const actualTextBefore = fullText.substring(Math.max(0, position - CONTEXT_SIZE), position)
					const actualTextAfter = fullText.substring(
						position + selectedText.length,
						Math.min(fullText.length, position + selectedText.length + textAfter.length)
					)
					let beforeScore = 0
					let afterScore = 0
					for (let i = 0; i < Math.min(textBefore.length, actualTextBefore.length); i++) {
						if (textBefore[textBefore.length - 1 - i] === actualTextBefore[actualTextBefore.length - 1 - i]) beforeScore++
					}
					for (let i = 0; i < Math.min(textAfter.length, actualTextAfter.length); i++) {
						if (textAfter[i] === actualTextAfter[i]) afterScore++
					}
					const totalChars = textBefore.length + textAfter.length
					match.contextScore = totalChars > 0 ? ((beforeScore + afterScore) / totalChars) * 100 : 0
				}

				return match
			})

			matches.sort((a, b) => {
				if (a.isExactPositionMatch && !b.isExactPositionMatch) return -1
				if (!a.isExactPositionMatch && b.isExactPositionMatch) return 1
				if (a.visualDistance !== undefined && b.visualDistance !== undefined) {
					if (Math.abs(a.visualDistance - b.visualDistance) > 10) return a.visualDistance - b.visualDistance
				}
				if (a.isWordBoundary !== b.isWordBoundary) return a.isWordBoundary ? -1 : 1
				if (Math.abs(a.contextScore - b.contextScore) > 20) return b.contextScore - a.contextScore
				if (a.visualDistance !== undefined && b.visualDistance !== undefined) return a.visualDistance - b.visualDistance
				return Math.abs(a.position - selectionPosition) - Math.abs(b.position - selectionPosition)
			})

			const bestMatch = matches[0]

			if (bestMatch?.node && bestMatch.startOffset !== undefined) {
				try {
					const range = document.createRange()
					range.setStart(bestMatch.node, bestMatch.startOffset)
					range.setEnd(bestMatch.node, bestMatch.startOffset + selectedText.length)

					const span = document.createElement('span')
					span.className = styles['orange-highlight'] || 'orange-highlight'

					try {
						range.surroundContents(span)
					} catch {
						const fragment = range.extractContents()
						span.appendChild(fragment)
						range.insertNode(span)
					}

					const newContent = divRef.current.innerHTML
					setContent(newContent)
					onChange?.(newContent)
					onMarkChange?.(selectedText.trim())
				} catch {
					// ignore range errors
				}
			}
		} catch {
			// ignore
		}

		setShowCommentInput(false)
	}, [savedSelection, onChange, onMarkChange, getTextNodesIn, commentText, onCommentAdd, selectedCriterion])

	return (
		<div style={{ position: 'relative', width: '100%' }}>
			<style dangerouslySetInnerHTML={{ __html: globalStyles }} />
			{isCommentable ? (
				<div
					ref={divRef}
					className={cn(styles.textarea, styles.editableDiv, styles['textarea--commentable'], className)}
					onMouseUp={handleMouseUp}
					dangerouslySetInnerHTML={{ __html: content }}
				/>
			) : (
				<textarea
					ref={textAreaRef}
					className={cn(styles.textarea, className)}
					value={value}
					onChange={e => onChange?.(e.target.value)}
					placeholder={placeholder}
					readOnly={readOnly}
				/>
			)}

			{showCommentInput && commentPos && createPortal(
				<div
					ref={commentPopupRef}
					className={styles.commentPopupWrapper}
					style={{ top: commentPos.top, left: commentPos.left }}
					onMouseDown={e => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation() }}
					onClick={e => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation() }}
				>
					<Image src={messagePart} alt='Часть комментария' />
					<div className={styles.commentPopup}>
						<div className={styles.commentInputWrapper}>
							<textarea
								className={styles.commentInput}
								placeholder='Комментарий...'
								onMouseDown={e => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation() }}
								onChange={e => setCommentText(e.target.value)}
								onClick={e => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation() }}
							/>
							<MarkCriteria withK={false} maxMark={3} onMarkChange={handleMarkSelect} />
						</div>
						<div className={styles.popupActions}>
							<button type='button' onClick={e => { e.stopPropagation(); e.preventDefault(); setShowCommentInput(false) }}>
								Отмена
							</button>
							<button type='button' onClick={e => { e.stopPropagation(); e.preventDefault(); handleAddComment() }}>
								Добавить
							</button>
						</div>
					</div>
				</div>,
				document.body
			)}
		</div>
	)
}

export default TextArea
