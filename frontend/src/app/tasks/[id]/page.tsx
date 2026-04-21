"use client";

import AverageMark from "@/components/ui/AverageMark/AverageMark";
import BackButton from "@/components/ui/BackButton/BackButton";
import Criteria from "@/components/ui/Criteria/Criteria";
import Input from "@/components/ui/Input/Input";
import MainTitle from "@/components/ui/MainTitle/MainTitle";
import SecondTitle from "@/components/ui/SecondTitle/SecondTitle";
import TextArea from "@/components/ui/TextArea/TextArea";
import ReservedField from "@/components/screens/CreateWorkPage/ui/task37/ui/ReservedField/ReservedField";
import api from "@/shared/utils/api";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./TaskDetailPage.module.css";

interface Task {
  id: string;
  type: "TASK37" | "TASK38" | "TASK39" | "TASK40";
  taskDescription: string;
  solution: string;
  imageBase64: string | null;
  transcription: string | null;
  k1: number;
  k2: number;
  k3: number;
  k4: number | null;
  k5: number | null;
  totalScore: number;
  feedback: Record<string, string>;
  createdAt: string;
}

function parseTask37Description(desc: string) {
  const lines = desc.split("\n");
  let subject = "";
  let emailText = "";
  let inlineInput = "";

  for (const line of lines) {
    if (line.startsWith("Subject: ")) {
      subject = line.replace("Subject: ", "");
    } else if (line.startsWith("Write about: ")) {
      inlineInput = line.replace("Write about: ", "");
    } else {
      emailText += (emailText ? "\n" : "") + line;
    }
  }

  return { subject, emailText: emailText.trim(), inlineInput };
}

function parseTask38Description(desc: string) {
  const lines = desc.split("\n");
  let topic = "";
  let problemFill = "";
  let opinionFill = "";

  for (const line of lines) {
    if (line.startsWith("Topic: ")) topic = line.replace("Topic: ", "");
    else if (line.startsWith("Problem context: "))
      problemFill = line.replace("Problem context: ", "");
    else if (line.startsWith("Opinion context: "))
      opinionFill = line.replace("Opinion context: ", "");
  }

  return { topic, problemFill, opinionFill };
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<{ data: { task: Task } }>(`/tasks/${id}`)
      .then((res) => setTask(res.data?.data?.task ?? null))
      .catch(() => setError("Не удалось загрузить задание"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)
    return (
      <div className={styles["page"]}>
        <p className={styles["status"]}>Загрузка...</p>
      </div>
    );
  if (error || !task)
    return (
      <div className={styles["page"]}>
        <BackButton />
        <p className={styles["status"]}>{error || "Задание не найдено"}</p>
      </div>
    );

  const isTask37 = task.type === "TASK37";
  const isTask39 = task.type === "TASK39";
  const isTask40 = task.type === "TASK40";
  const task37 = isTask37 ? parseTask37Description(task.taskDescription) : null;
  const task38 =
    task.type === "TASK38"
      ? parseTask38Description(task.taskDescription)
      : null;

  const titleMap = {
    TASK37: "Задание 37",
    TASK38: "Задание 38",
    TASK39: "Задание 39",
    TASK40: "Задание 40",
  };

  return (
    <div className={styles["page"]}>
      <BackButton />
      <div className={styles["content"]}>
        <MainTitle text={titleMap[task.type]} />

        <div className={styles["section"]}>
          <SecondTitle text="Условия задания" />

          {isTask37 && task37 && (
            <div className={styles["task-fields"]}>
              <div className={styles["reserved-fields"]}>
                <ReservedField text="From: Friend@mail.uk" />
                <ReservedField text="To: Russian_friend@ege.ru" />
              </div>
              <Input
                text="Subject:"
                placeholder=""
                value={task37.subject}
                onChange={() => {}}
                disabled
                className={styles["input"]}
              />
              <TextArea
                value={task37.emailText}
                readOnly
                className={styles["textarea"]}
              />
              <div className={styles["instructions"]}>
                <p className={styles["instruction-text"]}>
                  Write an email to Bill. In your message answer his questions,
                  ask 3 questions about{" "}
                  <input
                    type="text"
                    className={styles["inline-input"]}
                    value={task37.inlineInput}
                    disabled
                    readOnly
                  />
                  . Write 100−140 words. Remember the rules of email writing.
                </p>
              </div>
            </div>
          )}

          {isTask39 && (
            <div className={styles["task-fields"]}>
              <TextArea
                value={task.taskDescription}
                readOnly
                className={styles["textarea"]}
              />
            </div>
          )}

          {isTask40 && (
            <div className={styles["task-fields"]}>
              <p style={{ fontSize: "18px", lineHeight: "1.6", margin: 0 }}>
                You are considering using the in home tutoring service and
                you&apos;d like to get more information. In 1.5 minutes you are
                to ask four direct questions to find out the following.
              </p>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                {task.taskDescription
                  .split("\n")
                  .filter(Boolean)
                  .map((line, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        fontSize: "18px",
                      }}
                    >
                      <span
                        style={{
                          width: "26px",
                          height: "26px",
                          borderRadius: "50%",
                          background: "var(--active)",
                          color: "#fff",
                          fontSize: "14px",
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {i + 1}
                      </span>
                      <span>{line.replace(/^\d+\.\s*/, "")}</span>
                    </div>
                  ))}
              </div>
              <p
                style={{
                  fontSize: "18px",
                  color: "var(--grey-text)",
                  margin: 0,
                }}
              >
                You have 20 seconds to ask each question.
              </p>
            </div>
          )}

          {task.type === "TASK38" && task38 && (
            <div className={styles["task-fields"]}>
              <div className={styles["instructions"]}>
                <p className={styles["instruction-text"]}>
                  Imagine that you are doing a project on{" "}
                  <input
                    type="text"
                    className={styles["inline-input"]}
                    value={task38.topic}
                    disabled
                    readOnly
                  />
                  . You have found some data on the subject — the results of the
                  opinion polls (see the table below).
                  <br />
                  <br />
                  Comment on the data in the table and give your opinion on the
                  subject of the project.
                </p>
              </div>

              {task.imageBase64 && (
                <img
                  src={`data:image/png;base64,${task.imageBase64}`}
                  alt="График задания"
                  className={styles["task-image"]}
                />
              )}

              <div className={styles["plan"]}>
                <p className={styles["plan-text"]}>
                  Write{" "}
                  <span className={styles["plan-text--bold"]}>
                    200-250 words
                  </span>
                  .
                  <br />
                  Use the following plan:
                </p>
                <ul className={styles["plan-list"]}>
                  <li className={styles["plan-item"]}>
                    make an opening statement on the subject of the project;
                  </li>
                  <li className={styles["plan-item"]}>
                    select and report 2-3 facts;
                  </li>
                  <li className={styles["plan-item"]}>
                    make 1-2 comparisons where relevant and give your comments;
                  </li>
                  <li className={styles["plan-item"]}>
                    outline a problem that{" "}
                    <input
                      type="text"
                      className={styles["inline-input"]}
                      value={task38.problemFill}
                      disabled
                      readOnly
                    />{" "}
                    and suggest a way of solving it;
                  </li>
                  <li className={styles["plan-item"]}>
                    conclude by giving and explaining your opinion on{" "}
                    <input
                      type="text"
                      className={styles["inline-input"]}
                      value={task38.opinionFill}
                      disabled
                      readOnly
                    />
                    .
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {!isTask39 && !isTask40 && (
          <div className={styles["section"]}>
            <SecondTitle text="Работа ученика" />
            <TextArea
              value={task.solution}
              readOnly
              className={styles["textarea--student"]}
            />
          </div>
        )}

        {(isTask39 || isTask40) && task.transcription && (
          <div className={styles["section"]}>
            <SecondTitle text="Транскрипция" />
            <TextArea
              value={task.transcription}
              readOnly
              className={styles["textarea--student"]}
            />
          </div>
        )}

        <div className={styles["section"]}>
          <SecondTitle text="Оценки" />
          <div className={styles["marks"]}>
            {isTask37 ? (
              <>
                <Criteria
                  maxMark={2}
                  criteriaNumber="К1"
                  criteriaDescription="Решение коммуникативной задачи"
                  value={task.k1}
                  readonly
                />
                <Criteria
                  maxMark={2}
                  criteriaNumber="К2"
                  criteriaDescription="Организация текста"
                  value={task.k2}
                  readonly
                />
                <Criteria
                  maxMark={2}
                  criteriaNumber="К3"
                  criteriaDescription="Языковое оформление текста"
                  value={task.k3}
                  readonly
                />
              </>
            ) : isTask39 ? (
              <Criteria
                maxMark={1}
                criteriaNumber="К1"
                criteriaDescription="Фонетическая сторона речи"
                value={task.k1}
                readonly
              />
            ) : isTask40 ? (
              <>
                <Criteria
                  maxMark={1}
                  criteriaNumber="К1"
                  criteriaDescription="Вопрос 1"
                  value={task.k1}
                  readonly
                />
                <Criteria
                  maxMark={1}
                  criteriaNumber="К2"
                  criteriaDescription="Вопрос 2"
                  value={task.k2}
                  readonly
                />
                <Criteria
                  maxMark={1}
                  criteriaNumber="К3"
                  criteriaDescription="Вопрос 3"
                  value={task.k3}
                  readonly
                />
                <Criteria
                  maxMark={1}
                  criteriaNumber="К4"
                  criteriaDescription="Вопрос 4"
                  value={task.k4 ?? 0}
                  readonly
                />
              </>
            ) : (
              <>
                <Criteria
                  maxMark={3}
                  criteriaNumber="К1"
                  criteriaDescription="Решение коммуникативной задачи"
                  value={task.k1}
                  readonly
                />
                <Criteria
                  maxMark={3}
                  criteriaNumber="К2"
                  criteriaDescription="Организация текста"
                  value={task.k2}
                  readonly
                />
                <Criteria
                  maxMark={3}
                  criteriaNumber="К3"
                  criteriaDescription="Лексика"
                  value={task.k3}
                  readonly
                />
                <Criteria
                  maxMark={3}
                  criteriaNumber="К4"
                  criteriaDescription="Грамматика"
                  value={task.k4 ?? 0}
                  readonly
                />
                <Criteria
                  maxMark={3}
                  criteriaNumber="К5"
                  criteriaDescription="Орфография и пунктуация"
                  value={task.k5 ?? 0}
                  readonly
                />
              </>
            )}
            <AverageMark num={task.totalScore} />
          </div>
        </div>

        {task.feedback && (
          <div className={styles["section"]}>
            <SecondTitle text="Обратная связь" />
            <div className={styles["feedback"]}>
              {Object.entries(task.feedback).map(([key, text]) =>
                text ? (
                  <div key={key} className={styles["feedback__item"]}>
                    <p className={styles["feedback__text"]}>
                      {text.replace(/\*/g, "")}
                    </p>
                  </div>
                ) : null,
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
