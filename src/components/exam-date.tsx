"use client";
import { createContext, useContext, type ReactNode } from "react";
import { EXAM } from "@/lib/exam";

const Ctx = createContext<string>(EXAM.dateISO);
export const ExamDateProvider = ({ value, children }: { value: string; children: ReactNode }) =>
  <Ctx.Provider value={value}>{children}</Ctx.Provider>;
export const useExamDate = () => useContext(Ctx);
