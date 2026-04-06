import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";

export interface GeminiTask37Result {
  k1: number;
  k2: number;
  k3: number;
  totalScore: number;
  feedback: { k1: string; k2: string; k3: string };
  wordCount: number;
  truncated: boolean;
}

export interface GeminiTask38Result {
  k1: number;
  k2: number;
  k3: number;
  k4: number;
  k5: number;
  totalScore: number;
  feedback: { k1: string; k2: string; k3: string; k4: string; k5: string };
}

@Injectable()
export class GeminiService {
  private openai: OpenAI;
  private readonly promptsDir: string;
  private readonly securityPreamble: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>("OPENAI_API_KEY");
    this.openai = new OpenAI({ apiKey });
    this.promptsDir = path.join(__dirname, "prompts");
    this.securityPreamble = fs.readFileSync(
      path.join(this.promptsDir, "security_preamble.txt"),
      "utf-8",
    );
  }

  async checkTask37(
    taskDescription: string,
    solution: string,
  ): Promise<GeminiTask37Result> {
    const words = solution.match(/\b\w+\b/g) || [];
    let wordCount = words.length;
    let truncated = false;

    if (wordCount < 90) {
      return {
        k1: 0,
        k2: 0,
        k3: 0,
        totalScore: 0,
        feedback: {
          k1: `Недостаточно слов (${wordCount} < 90). Выставляется 0 баллов.`,
          k2: "",
          k3: "",
        },
        wordCount,
        truncated: false,
      };
    }

    if (wordCount > 154) {
      const truncatedWords = words.slice(0, 154);
      const lastWord = truncatedWords[truncatedWords.length - 1];
      const lastIdx = solution.lastIndexOf(lastWord, solution.length);
      solution = solution.substring(0, lastIdx + lastWord.length);
      wordCount = 154;
      truncated = true;
    }

    const userContent = this.wrapUserInput(taskDescription, solution);
    const usage = { prompt: 0, completion: 0 };

    const prompt1 = fs.readFileSync(path.join(this.promptsDir, 'prompt1.txt'), 'utf-8');
    const k1Response = await this.callOpenAI(this.securityPreamble + '\n\n' + prompt1, userContent, usage);
    const k1 = this.extractScore(k1Response);

    if (k1 === 0) {
      console.log(`[Tokens] task37 (k1=0): prompt=${usage.prompt} completion=${usage.completion} total=${usage.prompt + usage.completion}`);
      return {
        k1: 0,
        k2: 0,
        k3: 0,
        totalScore: 0,
        feedback: {
          k1: k1Response,
          k2: '',
          k3: '',
        },
        wordCount,
        truncated,
      };
    }

    const k2Response = await this.callOpenAI(this.securityPreamble + '\n\n' + fs.readFileSync(path.join(this.promptsDir, 'prompt2.txt'), 'utf-8'), userContent, usage);
    const k3Response = await this.callOpenAI(this.securityPreamble + '\n\n' + fs.readFileSync(path.join(this.promptsDir, 'prompt3.txt'), 'utf-8'), userContent, usage);
    const k2 = this.extractScore(k2Response);
    const k3 = this.extractScore(k3Response);

    console.log(`[Tokens] task37: prompt=${usage.prompt} completion=${usage.completion} total=${usage.prompt + usage.completion}`);

    return {
      k1,
      k2,
      k3,
      totalScore: k1 + k2 + k3,
      feedback: {
        k1: k1Response,
        k2: k2Response,
        k3: k3Response,
      },
      wordCount,
      truncated,
    };
  }

  async checkTask38(
    taskDescription: string,
    solution: string,
    imageBase64?: string,
  ): Promise<GeminiTask38Result> {
    const userContent = this.wrapUserInput(taskDescription, solution);
    const usage = { prompt: 0, completion: 0 };

    const prompt38_1 = fs.readFileSync(path.join(this.promptsDir, 'prompt38_1.txt'), 'utf-8');
    const k1Response = imageBase64
      ? await this.callOpenAIWithImage(this.securityPreamble + '\n\n' + prompt38_1, userContent, imageBase64, usage)
      : await this.callOpenAI(this.securityPreamble + '\n\n' + prompt38_1, userContent, usage);
    const k1 = this.extractScore(k1Response);

    if (k1 === 0) {
      console.log(`[Tokens] task38 (k1=0): prompt=${usage.prompt} completion=${usage.completion} total=${usage.prompt + usage.completion}`);
      return {
        k1: 0, k2: 0, k3: 0, k4: 0, k5: 0,
        totalScore: 0,
        feedback: { k1: k1Response, k2: '', k3: '', k4: '', k5: '' },
      };
    }

    const readPrompt = (name: string) => fs.readFileSync(path.join(this.promptsDir, name), 'utf-8');
    const k2Response = await this.callOpenAI(this.securityPreamble + '\n\n' + readPrompt('prompt38_2.txt'), userContent, usage);
    const k3Response = await this.callOpenAI(this.securityPreamble + '\n\n' + readPrompt('prompt38_3.txt'), userContent, usage);
    const k4Response = await this.callOpenAI(this.securityPreamble + '\n\n' + readPrompt('prompt38_4.txt'), userContent, usage);
    const k5Response = await this.callOpenAI(this.securityPreamble + '\n\n' + readPrompt('prompt38_5.txt'), userContent, usage);

    const k2 = this.extractScore(k2Response);
    const k3 = this.extractScore(k3Response);
    const k4 = this.extractScore(k4Response);
    const k5 = this.extractScore(k5Response);

    console.log(`[Tokens] task38: prompt=${usage.prompt} completion=${usage.completion} total=${usage.prompt + usage.completion}`);

    return {
      k1, k2, k3, k4, k5,
      totalScore: k1 + k2 + k3 + k4 + k5,
      feedback: { k1: k1Response, k2: k2Response, k3: k3Response, k4: k4Response, k5: k5Response },
    };
  }

  private sanitize(text: string): string {
    return text
      .replace(/<\/task_description>/gi, '[/task_description]')
      .replace(/<\/student_answer>/gi, '[/student_answer]')
      .replace(/<task_description>/gi, '[task_description]')
      .replace(/<student_answer>/gi, '[student_answer]');
  }

  private wrapUserInput(taskDescription: string, solution: string): string {
    return `<task_description>\n${this.sanitize(taskDescription)}\n</task_description>\n\n<student_answer>\n${this.sanitize(solution)}\n</student_answer>`;
  }

  private async callOpenAI(
    systemPrompt: string,
    userContent: string,
    usage: { prompt: number; completion: number },
  ): Promise<string> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await this.openai.chat.completions.create({
          model: "gpt-5.4-mini",
          temperature: 0.4,
          max_completion_tokens: 8192,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
        });
        usage.prompt += response.usage?.prompt_tokens ?? 0;
        usage.completion += response.usage?.completion_tokens ?? 0;
        return response.choices[0].message.content ?? '';
      } catch (err) {
        console.error(`[OpenAI] callOpenAI attempt ${attempt + 1} failed:`, err);
        if (attempt === 2)
          throw new InternalServerErrorException("Сервис проверки временно недоступен. Попробуйте позже.");
        await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
      }
    }
  }

  private async callOpenAIWithImage(
    systemPrompt: string,
    userContent: string,
    imageBase64: string,
    usage: { prompt: number; completion: number },
  ): Promise<string> {
    const mimeType = imageBase64.startsWith("/9j/") ? "image/jpeg" : "image/png";
    const dataUrl = `data:${mimeType};base64,${imageBase64}`;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await this.openai.chat.completions.create({
          model: "gpt-5.4-mini",
          temperature: 0.4,
          max_completion_tokens: 8192,
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: userContent },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
        });
        usage.prompt += response.usage?.prompt_tokens ?? 0;
        usage.completion += response.usage?.completion_tokens ?? 0;
        return response.choices[0].message.content ?? '';
      } catch (err) {
        console.error(`[OpenAI] callOpenAIWithImage attempt ${attempt + 1} failed:`, err);
        if (attempt === 2)
          throw new InternalServerErrorException("Сервис проверки временно недоступен. Попробуйте позже.");
        await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
      }
    }
  }

  private extractScore(text: string): number {
    const patterns = [
      /Итоговый балл:?\s*(\d+)(?:\s*балл|\.|\s|$)/i,
      /ИТОГОВЫЙ БАЛЛ:?\s*(\d+)(?:\s*балл|\.|\s|$)/i,
      /итоговый балл:?\s*(\d+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return parseInt(match[1], 10);
    }

    const lastSection = text.includes("ИТОГОВАЯ ОЦЕНКА")
      ? text.split("ИТОГОВАЯ ОЦЕНКА").pop()
      : text;

    const fallback = lastSection?.match(/(\d+)\s*балл/);
    if (fallback) return parseInt(fallback[1], 10);

    return 0;
  }
}
