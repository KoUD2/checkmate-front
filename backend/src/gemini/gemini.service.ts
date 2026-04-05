import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenerativeAI } from "@google/generative-ai";
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
  private genAI: GoogleGenerativeAI;
  private readonly promptsDir: string;
  private readonly securityPreamble: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>("GEMINI_API_KEY");
    this.genAI = new GoogleGenerativeAI(apiKey);
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

    // Проверяем К1 первым
    const prompt1 = fs.readFileSync(path.join(this.promptsDir, 'prompt1.txt'), 'utf-8');
    const k1Response = await this.callGemini(this.securityPreamble + '\n\n' + prompt1, userContent);
    const k1 = this.extractScore(k1Response);

    // Если К1 = 0 — остальные критерии не проверяем
    if (k1 === 0) {
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

    const k2Response = await this.callGemini(this.securityPreamble + '\n\n' + fs.readFileSync(path.join(this.promptsDir, 'prompt2.txt'), 'utf-8'), userContent);
    const k3Response = await this.callGemini(this.securityPreamble + '\n\n' + fs.readFileSync(path.join(this.promptsDir, 'prompt3.txt'), 'utf-8'), userContent);
    const k2 = this.extractScore(k2Response);
    const k3 = this.extractScore(k3Response);

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
    // Проверяем К1 первым
    const prompt38_1 = fs.readFileSync(path.join(this.promptsDir, 'prompt38_1.txt'), 'utf-8');
    const k1Response = imageBase64
      ? await this.callGeminiWithImage(this.securityPreamble + '\n\n' + prompt38_1, userContent, imageBase64)
      : await this.callGemini(this.securityPreamble + '\n\n' + prompt38_1, userContent);
    const k1 = this.extractScore(k1Response);

    // Если К1 = 0 — остальные критерии не проверяем
    if (k1 === 0) {
      return {
        k1: 0, k2: 0, k3: 0, k4: 0, k5: 0,
        totalScore: 0,
        feedback: { k1: k1Response, k2: '', k3: '', k4: '', k5: '' },
      };
    }

    const readPrompt = (name: string) => fs.readFileSync(path.join(this.promptsDir, name), 'utf-8');
    const k2Response = await this.callGemini(this.securityPreamble + '\n\n' + readPrompt('prompt38_2.txt'), userContent);
    const k3Response = await this.callGemini(this.securityPreamble + '\n\n' + readPrompt('prompt38_3.txt'), userContent);
    const k4Response = await this.callGemini(this.securityPreamble + '\n\n' + readPrompt('prompt38_4.txt'), userContent);
    const k5Response = await this.callGemini(this.securityPreamble + '\n\n' + readPrompt('prompt38_5.txt'), userContent);

    const k2 = this.extractScore(k2Response);
    const k3 = this.extractScore(k3Response);
    const k4 = this.extractScore(k4Response);
    const k5 = this.extractScore(k5Response);

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

  private async callGemini(
    systemPrompt: string,
    userContent: string,
  ): Promise<string> {
    const model = this.genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite-preview",
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: 0.4,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    });

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await model.generateContent(userContent);
        return result.response.text();
      } catch (err) {
        console.error(
          `[Gemini] callGemini attempt ${attempt + 1} failed:`,
          err,
        );
        if (attempt === 2)
          throw new InternalServerErrorException("Сервис проверки временно недоступен. Попробуйте позже.");
        await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
      }
    }
  }

  private async callGeminiWithImage(
    systemPrompt: string,
    userContent: string,
    imageBase64: string,
  ): Promise<string> {
    const model = this.genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite-preview",
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: 0.4,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    });

    const mimeType = imageBase64.startsWith("/9j/")
      ? "image/jpeg"
      : "image/png";

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await model.generateContent([
          userContent,
          { inlineData: { mimeType, data: imageBase64 } },
        ]);
        return result.response.text();
      } catch (err) {
        console.error(
          `[Gemini] callGeminiWithImage attempt ${attempt + 1} failed:`,
          err,
        );
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
