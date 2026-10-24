"use client";

import { useState, useTransition } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { changePassword } from "@/lib/auth-actions";

const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, { message: "Masukkan kata sandi saat ini." }),
    newPassword: z
      .string()
      .min(10, { message: "Kata sandi baru minimal 10 karakter." })
      .max(72, { message: "Kata sandi baru maksimal 72 karakter." }),
    confirmPassword: z.string().min(1, { message: "Ulangi kata sandi baru." }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Konfirmasi kata sandi tidak cocok.",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "Kata sandi baru harus berbeda dari kata sandi saat ini.",
    path: ["newPassword"],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>;

export function ChangePasswordForm() {
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (values: ChangePasswordFormValues) => {
    setErrorMessage(undefined);
    startTransition(async () => {
      const result = await changePassword(values);
      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      toast.success("Kata sandi berhasil diperbarui.");
      form.reset();
    });
  };

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-5 text-primary" />
          Formulir Ganti Kata Sandi
        </CardTitle>
        <CardDescription>
          Masukkan kata sandi akun Anda saat ini, lalu tentukan kata sandi baru (minimal 10 karakter).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FieldGroup className="gap-4">
            <Controller
              control={form.control}
              name="currentPassword"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="current-password">Kata sandi saat ini</FieldLabel>
                  <Input
                    {...field}
                    id="current-password"
                    type="password"
                    placeholder="Masukkan kata sandi saat ini"
                    autoComplete="current-password"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="newPassword"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="new-password">Kata sandi baru</FieldLabel>
                  <Input
                    {...field}
                    id="new-password"
                    type="password"
                    placeholder="Minimal 10 karakter"
                    autoComplete="new-password"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="confirmPassword"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="confirm-password">Ulangi kata sandi baru</FieldLabel>
                  <Input
                    {...field}
                    id="confirm-password"
                    type="password"
                    placeholder="Ulangi kata sandi baru"
                    autoComplete="new-password"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
          {errorMessage && <p className="text-destructive text-sm">{errorMessage}</p>}
          <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
            {isPending ? "Menyimpan..." : "Simpan Kata Sandi"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
