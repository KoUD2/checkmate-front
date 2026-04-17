import styles from './ArticleView.module.css'

interface ArticleContent {
  body: string
}

interface Props {
  content: ArticleContent
}

export default function ArticleView({ content }: Props) {
  return (
    <div
      className={styles.article}
      dangerouslySetInnerHTML={{ __html: content.body }}
    />
  )
}
