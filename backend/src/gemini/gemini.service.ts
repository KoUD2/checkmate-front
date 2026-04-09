import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { ProxyAgent, Agent, fetch as undiciFetch } from "undici";
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

export interface GeminiTask39Result {
  k1: number;
  totalScore: number;
  feedback: { k1: string };
  transcription: string;
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
    solutionImageBase64?: string,
  ): Promise<GeminiTask37Result> {
    const words = solution.match(/\b\w+\b/g) || [];
    let wordCount = words.length;
    let truncated = false;

    if (!solutionImageBase64) {
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
    }

    const userContent = this.wrapUserInput(taskDescription, solution, !!solutionImageBase64);
    const usage = { prompt: 0, completion: 0 };
    const images = solutionImageBase64 ? [solutionImageBase64] : [];

    const prompt1 = fs.readFileSync(path.join(this.promptsDir, 'prompt1.txt'), 'utf-8');
    const k1Response = solutionImageBase64
      ? await this.callOpenAIWithImage(this.securityPreamble + '\n\n' + prompt1, userContent, images, usage)
      : await this.callOpenAI(this.securityPreamble + '\n\n' + prompt1, userContent, usage);
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

    const readPrompt = (name: string) => fs.readFileSync(path.join(this.promptsDir, name), 'utf-8');
    const k2Response = solutionImageBase64
      ? await this.callOpenAIWithImage(this.securityPreamble + '\n\n' + readPrompt('prompt2.txt'), userContent, images, usage)
      : await this.callOpenAI(this.securityPreamble + '\n\n' + readPrompt('prompt2.txt'), userContent, usage);
    const k3Response = solutionImageBase64
      ? await this.callOpenAIWithImage(this.securityPreamble + '\n\n' + readPrompt('prompt3.txt'), userContent, images, usage)
      : await this.callOpenAI(this.securityPreamble + '\n\n' + readPrompt('prompt3.txt'), userContent, usage);
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
    solutionImageBase64?: string,
  ): Promise<GeminiTask38Result> {
    const userContent = this.wrapUserInput(taskDescription, solution, !!solutionImageBase64);
    const usage = { prompt: 0, completion: 0 };

    // For k1: include chart image + solution image (if available)
    const k1Images = [imageBase64, solutionImageBase64].filter(Boolean) as string[];
    // For k2-k5: only need solution image
    const solImages = solutionImageBase64 ? [solutionImageBase64] : [];

    const readPrompt = (name: string) => fs.readFileSync(path.join(this.promptsDir, name), 'utf-8');

    const prompt38_1 = readPrompt('prompt38_1.txt');
    const k1Response = k1Images.length > 0
      ? await this.callOpenAIWithImage(this.securityPreamble + '\n\n' + prompt38_1, userContent, k1Images, usage)
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

    const callFn = (promptFile: string) => solImages.length > 0
      ? this.callOpenAIWithImage(this.securityPreamble + '\n\n' + readPrompt(promptFile), userContent, solImages, usage)
      : this.callOpenAI(this.securityPreamble + '\n\n' + readPrompt(promptFile), userContent, usage);

    const k2Response = await callFn('prompt38_2.txt');
    const k3Response = await callFn('prompt38_3.txt');
    const k4Response = await callFn('prompt38_4.txt');
    const k5Response = await callFn('prompt38_5.txt');

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

  async checkTask39(
    taskText: string,
    audioBase64: string,
  ): Promise<GeminiTask39Result> {
    // Strip data URI prefix if present
    const base64Data = audioBase64.includes(',')
      ? audioBase64.split(',')[1]
      : audioBase64;

    const audioBuffer = Buffer.from(base64Data, 'base64');

    let transcription = '';
    try {
      const apiKey = this.configService.get<string>('OPENAI_API_KEY');
      const proxyUrl = this.configService.get<string>('GEMINI_PROXY');

      const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : new Agent();

      const form = new (globalThis as any).FormData();
      const blob = new Blob([audioBuffer], { type: 'audio/webm' });
      form.append('file', blob, 'recording.webm');
      form.append('model', 'whisper-1');
      form.append('language', 'en');

      const res = await undiciFetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
        dispatcher,
      } as any);

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Whisper API error ${res.status}: ${errText}`);
      }

      const data = await res.json() as any;
      transcription = data.text ?? '';
    } catch (err) {
      console.error('[Whisper] transcription failed:', err);
      throw new InternalServerErrorException('Ошибка транскрипции аудио. Попробуйте позже.');
    }

    if (!transcription.trim()) {
      return {
        k1: 0,
        totalScore: 0,
        feedback: {
          k1: 'Аудиозапись не содержит распознаваемой речи. Выставляется 0 баллов.',
        },
        transcription: '',
      };
    }

    const userContent = `<original_text>\n${this.sanitize(taskText)}\n</original_text>\n\n<transcription>\n${this.sanitize(transcription)}\n</transcription>`;
    const usage = { prompt: 0, completion: 0 };
    const readPrompt = (name: string) => fs.readFileSync(path.join(this.promptsDir, name), 'utf-8');

    const k1Response = await this.callOpenAI(
      this.securityPreamble + '\n\n' + readPrompt('prompt39_1.txt'),
      userContent,
      usage,
    );

    const k1 = Math.min(1, this.extractScore(k1Response));

    console.log(`[Tokens] task39: prompt=${usage.prompt} completion=${usage.completion} total=${usage.prompt + usage.completion}`);

    return {
      k1,
      totalScore: k1,
      feedback: { k1: k1Response },
      transcription,
    };
  }

  private sanitize(text: string): string {
    return text
      .replace(/<\/task_description>/gi, '[/task_description]')
      .replace(/<\/student_answer>/gi, '[/student_answer]')
      .replace(/<task_description>/gi, '[task_description]')
      .replace(/<student_answer>/gi, '[student_answer]');
  }

  private wrapUserInput(taskDescription: string, solution: string, hasImage = false): string {
    const answerContent = hasImage && !solution.trim()
      ? '[Ответ ученика предоставлен в виде изображения]'
      : this.sanitize(solution);
    return `<task_description>\n${this.sanitize(taskDescription)}\n</task_description>\n\n<student_answer>\n${answerContent}\n</student_answer>`;
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
    images: string[],
    usage: { prompt: number; completion: number },
  ): Promise<string> {
    const imageContents = images.map(img => {
      const mimeType = img.startsWith("/9j/") ? "image/jpeg" : "image/png";
      return { type: "image_url" as const, image_url: { url: `data:${mimeType};base64,${img}` } };
    });

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
                ...imageContents,
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
