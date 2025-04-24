import api from "@/shared/utils/api";
import { EssayFormData } from "./types";

export const submitEssay = async (data: EssayFormData): Promise<void> => {
  try {
    await api.post("/essays", data);
  } catch (error) {
    throw error;
  }
};
