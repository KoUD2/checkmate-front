import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { ProxyAgent, Agent, fetch as undiciFetch, FormData as UndiciFormData } from "undici";
import * as fs from "fs";
import * as path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import * as os from "os";

const execFileAsync = promisify(execFile);

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

export interface GeminiTask40Result {
  k1: number;
  k2: number;
  k3: number;
  k4: number;
  totalScore: number;
  feedback: { k1: string; k2: string; k3: string; k4: string };
  transcription: string;
}

export interface GeminiTask41Result {
  k1: number;
  k2: number;
  k3: number;
  k4: number;
  k5: number;
  totalScore: number;
  feedback: { k1: string; k2: string; k3: string; k4: string; k5: string };
  transcription: string;
}

export interface GeminiTask42Result {
  k1: number;
  k2: number;
  k3: number;
  totalScore: number;
  feedback: { k1: string; k2: string; k3: string };
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
    const distPromptsDir = path.join(__dirname, "prompts");
    const srcPromptsDir = path.join(process.cwd(), "src", "gemini", "prompts");
    this.promptsDir = fs.existsSync(path.join(distPromptsDir, "security_preamble.txt"))
      ? distPromptsDir
      : srcPromptsDir;
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
    audioFileName?: string,
  ): Promise<GeminiTask39Result> {
    let mimeType = 'audio/webm';
    let filename = 'recording.webm';
    let base64Data = audioBase64;

    if (audioBase64.includes(',')) {
      const prefix = audioBase64.split(',')[0];
      const match = prefix.match(/data:([^;]+)/);
      if (match) {
        mimeType = match[1];
      }
      base64Data = audioBase64.split(',')[1];
    }

    // Normalize MIME type to what Whisper actually accepts
    const MIME_MAP: Record<string, string> = {
      'audio/x-m4a': 'audio/mp4',
      'audio/m4a': 'audio/mp4',
      'audio/mp3': 'audio/mpeg',
      'audio/x-wav': 'audio/wav',
      'audio/wave': 'audio/wav',
      'video/mp4': 'audio/mp4',
      'video/webm': 'audio/webm',
    };
    const normalizedMime = MIME_MAP[mimeType] ?? mimeType;

    // Use original filename extension if provided (most reliable for Whisper)
    if (audioFileName) {
      const dotIdx = audioFileName.lastIndexOf('.');
      if (dotIdx !== -1) {
        filename = `recording${audioFileName.slice(dotIdx)}`;
      }
    } else {
      const ext = normalizedMime.split('/')[1]?.split(';')[0] || 'webm';
      filename = `recording.${ext}`;
    }

    let audioBuffer = Buffer.from(base64Data, 'base64');
    const brand = audioBuffer.slice(8, 12).toString('ascii');
    console.log(`[Whisper] sending file: ${filename}, mimeType: ${normalizedMime}, bufferBytes: ${audioBuffer.length}, brand: ${brand}`);

    // Convert 3GPP files (iPhone voice memos) to wav via ffmpeg
    if (brand.startsWith('3gp') || brand === 'isom' && normalizedMime !== 'audio/webm') {
      try {
        const tmpIn = path.join(os.tmpdir(), `audio_in_${Date.now()}`);
        const tmpOut = path.join(os.tmpdir(), `audio_out_${Date.now()}.wav`);
        fs.writeFileSync(tmpIn, audioBuffer);
        await execFileAsync('ffmpeg', ['-y', '-i', tmpIn, '-ar', '16000', '-ac', '1', tmpOut]);
        audioBuffer = fs.readFileSync(tmpOut);
        fs.unlinkSync(tmpIn);
        fs.unlinkSync(tmpOut);
        filename = 'recording.wav';
        console.log(`[Whisper] converted to wav, newSize: ${audioBuffer.length}`);
      } catch (convErr) {
        console.error('[Whisper] ffmpeg conversion failed:', convErr);
      }
    }

    let transcription = '';
    try {
      const apiKey = this.configService.get<string>('OPENAI_API_KEY');
      const proxyUrl = this.configService.get<string>('GEMINI_PROXY');

      const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : new Agent();

      const form = new UndiciFormData();
      const blob = new Blob([audioBuffer], { type: 'application/octet-stream' });
      form.append('file', blob, filename);
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

  async checkTask40(
    audioBase64: string,
    audioFileName?: string,
    questions?: string[],
  ): Promise<GeminiTask40Result> {
    let mimeType = 'audio/webm';
    let filename = 'recording.webm';
    let base64Data = audioBase64;

    if (audioBase64.includes(',')) {
      const prefix = audioBase64.split(',')[0];
      const match = prefix.match(/data:([^;]+)/);
      if (match) mimeType = match[1];
      base64Data = audioBase64.split(',')[1];
    }

    const MIME_MAP: Record<string, string> = {
      'audio/x-m4a': 'audio/mp4',
      'audio/m4a': 'audio/mp4',
      'audio/mp3': 'audio/mpeg',
      'audio/x-wav': 'audio/wav',
      'audio/wave': 'audio/wav',
      'video/mp4': 'audio/mp4',
      'video/webm': 'audio/webm',
    };
    const normalizedMime = MIME_MAP[mimeType] ?? mimeType;

    if (audioFileName) {
      const dotIdx = audioFileName.lastIndexOf('.');
      if (dotIdx !== -1) filename = `recording${audioFileName.slice(dotIdx)}`;
    } else {
      const ext = normalizedMime.split('/')[1]?.split(';')[0] || 'webm';
      filename = `recording.${ext}`;
    }

    let audioBuffer = Buffer.from(base64Data, 'base64');
    const brand = audioBuffer.slice(8, 12).toString('ascii');
    console.log(`[Whisper task40] file: ${filename}, mime: ${normalizedMime}, bytes: ${audioBuffer.length}, brand: ${brand}`);

    if (brand.startsWith('3gp') || brand === 'isom' && normalizedMime !== 'audio/webm') {
      try {
        const tmpIn = path.join(os.tmpdir(), `audio40_in_${Date.now()}`);
        const tmpOut = path.join(os.tmpdir(), `audio40_out_${Date.now()}.wav`);
        fs.writeFileSync(tmpIn, audioBuffer);
        await execFileAsync('ffmpeg', ['-y', '-i', tmpIn, '-ar', '16000', '-ac', '1', tmpOut]);
        audioBuffer = fs.readFileSync(tmpOut);
        fs.unlinkSync(tmpIn);
        fs.unlinkSync(tmpOut);
        filename = 'recording.wav';
      } catch (convErr) {
        console.error('[Whisper task40] ffmpeg conversion failed:', convErr);
      }
    }

    let transcription = '';
    try {
      const apiKey = this.configService.get<string>('OPENAI_API_KEY');
      const proxyUrl = this.configService.get<string>('GEMINI_PROXY');
      const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : new Agent();

      const form = new UndiciFormData();
      const blob = new Blob([audioBuffer], { type: 'application/octet-stream' });
      form.append('file', blob, filename);
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
      console.error('[Whisper task40] transcription failed:', err);
      throw new InternalServerErrorException('Ошибка транскрипции аудио. Попробуйте позже.');
    }

    if (!transcription.trim()) {
      return {
        k1: 0, k2: 0, k3: 0, k4: 0,
        totalScore: 0,
        feedback: { k1: 'Аудиозапись не содержит распознаваемой речи.', k2: '', k3: '', k4: '' },
        transcription: '',
      };
    }

    const topicsBlock = questions && questions.length > 0
      ? questions.map((q, i) => `${i + 1}. ${this.sanitize(q)}`).join('\n')
      : '1. (не указано)\n2. (не указано)\n3. (не указано)\n4. (не указано)';
    const userContent = `<task_topics>\n${topicsBlock}\n</task_topics>\n\n<transcription>\n${this.sanitize(transcription)}\n</transcription>`;
    const usage = { prompt: 0, completion: 0 };
    const readPrompt = (name: string) => fs.readFileSync(path.join(this.promptsDir, name), 'utf-8');

    const response = await this.callOpenAI(
      this.securityPreamble + '\n\n' + readPrompt('prompt40_1.txt'),
      userContent,
      usage,
    );

    const k1 = this.extractKScore(response, 1);
    const k2 = this.extractKScore(response, 2);
    const k3 = this.extractKScore(response, 3);
    const k4 = this.extractKScore(response, 4);

    console.log(`[Tokens] task40: prompt=${usage.prompt} completion=${usage.completion} total=${usage.prompt + usage.completion}`);

    return {
      k1, k2, k3, k4,
      totalScore: k1 + k2 + k3 + k4,
      feedback: { k1: response, k2: '', k3: '', k4: '' },
      transcription,
    };
  }

  private extractKScore(text: string, k: number): number {
    // Match patterns like "К1 ...: ... Балл: 1" or "K1 ...: ... Score: 1"
    const patterns = [
      new RegExp(`К${k}[^\\n]*Балл:\\s*(\\d)`, 'i'),
      new RegExp(`K${k}[^\\n]*Балл:\\s*(\\d)`, 'i'),
      new RegExp(`К${k}[^\\n]*Score:\\s*(\\d)`, 'i'),
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m) return Math.min(1, parseInt(m[1], 10));
    }
    return 0;
  }

  async checkTask41(
    audioBase64: string,
    audioFileName?: string,
    questions?: string[],
  ): Promise<GeminiTask41Result> {
    let mimeType = 'audio/webm';
    let filename = 'recording.webm';
    let base64Data = audioBase64;

    if (audioBase64.includes(',')) {
      const prefix = audioBase64.split(',')[0];
      const match = prefix.match(/data:([^;]+)/);
      if (match) mimeType = match[1];
      base64Data = audioBase64.split(',')[1];
    }

    const MIME_MAP: Record<string, string> = {
      'audio/x-m4a': 'audio/mp4',
      'audio/m4a': 'audio/mp4',
      'audio/mp3': 'audio/mpeg',
      'audio/x-wav': 'audio/wav',
      'audio/wave': 'audio/wav',
      'video/mp4': 'audio/mp4',
      'video/webm': 'audio/webm',
    };
    const normalizedMime = MIME_MAP[mimeType] ?? mimeType;

    if (audioFileName) {
      const dotIdx = audioFileName.lastIndexOf('.');
      if (dotIdx !== -1) filename = `recording${audioFileName.slice(dotIdx)}`;
    } else {
      const ext = normalizedMime.split('/')[1]?.split(';')[0] || 'webm';
      filename = `recording.${ext}`;
    }

    let audioBuffer = Buffer.from(base64Data, 'base64');
    const brand = audioBuffer.slice(8, 12).toString('ascii');
    console.log(`[Whisper task41] file: ${filename}, mime: ${normalizedMime}, bytes: ${audioBuffer.length}, brand: ${brand}`);

    if (brand.startsWith('3gp') || brand === 'isom' && normalizedMime !== 'audio/webm') {
      try {
        const tmpIn = path.join(os.tmpdir(), `audio41_in_${Date.now()}`);
        const tmpOut = path.join(os.tmpdir(), `audio41_out_${Date.now()}.wav`);
        fs.writeFileSync(tmpIn, audioBuffer);
        await execFileAsync('ffmpeg', ['-y', '-i', tmpIn, '-ar', '16000', '-ac', '1', tmpOut]);
        audioBuffer = fs.readFileSync(tmpOut);
        fs.unlinkSync(tmpIn);
        fs.unlinkSync(tmpOut);
        filename = 'recording.wav';
      } catch (convErr) {
        console.error('[Whisper task41] ffmpeg conversion failed:', convErr);
      }
    }

    let transcription = '';
    try {
      const apiKey = this.configService.get<string>('OPENAI_API_KEY');
      const proxyUrl = this.configService.get<string>('GEMINI_PROXY');
      const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : new Agent();

      const form = new UndiciFormData();
      const blob = new Blob([audioBuffer], { type: 'application/octet-stream' });
      form.append('file', blob, filename);
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
      console.error('[Whisper task41] transcription failed:', err);
      throw new InternalServerErrorException('Ошибка транскрипции аудио. Попробуйте позже.');
    }

    if (!transcription.trim()) {
      return {
        k1: 0, k2: 0, k3: 0, k4: 0, k5: 0,
        totalScore: 0,
        feedback: { k1: 'Аудиозапись не содержит распознаваемой речи.', k2: '', k3: '', k4: '', k5: '' },
        transcription: '',
      };
    }

    const questionsBlock = questions && questions.length > 0
      ? questions.map((q, i) => `${i + 1}. ${this.sanitize(q)}`).join('\n')
      : '1. (не указано)\n2. (не указано)\n3. (не указано)\n4. (не указано)\n5. (не указано)';
    const userContent = `<questions>\n${questionsBlock}\n</questions>\n\n<transcription>\n${this.sanitize(transcription)}\n</transcription>`;
    const usage = { prompt: 0, completion: 0 };
    const readPrompt = (name: string) => fs.readFileSync(path.join(this.promptsDir, name), 'utf-8');

    const response = await this.callOpenAI(
      this.securityPreamble + '\n\n' + readPrompt('prompt41_1.txt'),
      userContent,
      usage,
    );

    const k1 = this.extractKScore(response, 1);
    const k2 = this.extractKScore(response, 2);
    const k3 = this.extractKScore(response, 3);
    const k4 = this.extractKScore(response, 4);
    const k5 = this.extractKScore(response, 5);

    console.log(`[Tokens] task41: prompt=${usage.prompt} completion=${usage.completion} total=${usage.prompt + usage.completion}`);

    return {
      k1, k2, k3, k4, k5,
      totalScore: k1 + k2 + k3 + k4 + k5,
      feedback: { k1: response, k2: '', k3: '', k4: '', k5: '' },
      transcription,
    };
  }

  async checkTask42(
    audioBase64: string,
    audioFileName?: string,
    taskText?: string,
    bullets?: string[],
    image1Base64?: string,
    image2Base64?: string,
  ): Promise<GeminiTask42Result> {
    let mimeType = 'audio/webm';
    let filename = 'recording.webm';
    let base64Data = audioBase64;

    if (audioBase64.includes(',')) {
      const prefix = audioBase64.split(',')[0];
      const match = prefix.match(/data:([^;]+)/);
      if (match) mimeType = match[1];
      base64Data = audioBase64.split(',')[1];
    }

    const MIME_MAP: Record<string, string> = {
      'audio/x-m4a': 'audio/mp4',
      'audio/m4a': 'audio/mp4',
      'audio/mp3': 'audio/mpeg',
      'audio/x-wav': 'audio/wav',
      'audio/wave': 'audio/wav',
      'video/mp4': 'audio/mp4',
      'video/webm': 'audio/webm',
    };
    const normalizedMime = MIME_MAP[mimeType] ?? mimeType;

    if (audioFileName) {
      const dotIdx = audioFileName.lastIndexOf('.');
      if (dotIdx !== -1) filename = `recording${audioFileName.slice(dotIdx)}`;
    } else {
      const ext = normalizedMime.split('/')[1]?.split(';')[0] || 'webm';
      filename = `recording.${ext}`;
    }

    let audioBuffer = Buffer.from(base64Data, 'base64');
    const brand = audioBuffer.slice(8, 12).toString('ascii');
    console.log(`[Whisper task42] file: ${filename}, mime: ${normalizedMime}, bytes: ${audioBuffer.length}, brand: ${brand}`);

    if (brand.startsWith('3gp') || brand === 'isom' && normalizedMime !== 'audio/webm') {
      try {
        const tmpIn = path.join(os.tmpdir(), `audio42_in_${Date.now()}`);
        const tmpOut = path.join(os.tmpdir(), `audio42_out_${Date.now()}.wav`);
        fs.writeFileSync(tmpIn, audioBuffer);
        await execFileAsync('ffmpeg', ['-y', '-i', tmpIn, '-ar', '16000', '-ac', '1', tmpOut]);
        audioBuffer = fs.readFileSync(tmpOut);
        fs.unlinkSync(tmpIn);
        fs.unlinkSync(tmpOut);
        filename = 'recording.wav';
      } catch (convErr) {
        console.error('[Whisper task42] ffmpeg conversion failed:', convErr);
      }
    }

    let transcription = '';
    try {
      const apiKey = this.configService.get<string>('OPENAI_API_KEY');
      const proxyUrl = this.configService.get<string>('GEMINI_PROXY');
      const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : new Agent();

      const form = new UndiciFormData();
      const blob = new Blob([audioBuffer], { type: 'application/octet-stream' });
      form.append('file', blob, filename);
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
      console.error('[Whisper task42] transcription failed:', err);
      throw new InternalServerErrorException('Ошибка транскрипции аудио. Попробуйте позже.');
    }

    if (!transcription.trim()) {
      return {
        k1: 0, k2: 0, k3: 0,
        totalScore: 0,
        feedback: { k1: 'Аудиозапись не содержит распознаваемой речи.', k2: '', k3: '' },
        transcription: '',
      };
    }

    const taskTextBlock = taskText
      ? `<task_text>\n${this.sanitize(taskText)}\n</task_text>\n\n`
      : '';
    const bulletsBlock = bullets && bullets.length > 0
      ? `<bullets>\n${bullets.map((b, i) => `${i + 1}. ${this.sanitize(b)}`).join('\n')}\n</bullets>\n\n`
      : '';
    const userContent = `${taskTextBlock}${bulletsBlock}<transcription>\n${this.sanitize(transcription)}\n</transcription>`;
    const usage = { prompt: 0, completion: 0 };
    const readPrompt = (name: string) => fs.readFileSync(path.join(this.promptsDir, name), 'utf-8');

    const images = [image1Base64, image2Base64].filter((img): img is string => !!img?.trim());
    const resp1 = images.length > 0
      ? await this.callOpenAIWithImage(this.securityPreamble + '\n\n' + readPrompt('prompt42_1.txt'), userContent, images, usage)
      : await this.callOpenAI(this.securityPreamble + '\n\n' + readPrompt('prompt42_1.txt'), userContent, usage);
    const k1 = Math.min(4, this.extractScore(resp1));

    if (k1 === 0) {
      console.log(`[Tokens] task42 (k1=0, skipped k2/k3): prompt=${usage.prompt} completion=${usage.completion} total=${usage.prompt + usage.completion}`);
      return {
        k1: 0, k2: 0, k3: 0,
        totalScore: 0,
        feedback: { k1: resp1, k2: '', k3: '' },
        transcription,
      };
    }

    const [resp2, resp3] = await Promise.all([
      this.callOpenAI(this.securityPreamble + '\n\n' + readPrompt('prompt42_2.txt'), userContent, usage),
      this.callOpenAI(this.securityPreamble + '\n\n' + readPrompt('prompt42_3.txt'), userContent, usage),
    ]);

    const k2 = Math.min(3, this.extractScore(resp2));
    const k3 = Math.min(3, this.extractScore(resp3));

    console.log(`[Tokens] task42: prompt=${usage.prompt} completion=${usage.completion} total=${usage.prompt + usage.completion}`);

    return {
      k1, k2, k3,
      totalScore: k1 + k2 + k3,
      feedback: { k1: resp1, k2: resp2, k3: resp3 },
      transcription,
    };
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

  async synthesizeSpeech(text: string): Promise<string> {
    const mp3 = await this.openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: text,
      response_format: 'mp3',
    } as any);
    const buffer = Buffer.from(await mp3.arrayBuffer());
    return buffer.toString('base64');
  }
}
