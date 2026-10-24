"use client";

import { useState, useTransition } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signIn } from "@/lib/auth-actions";

const formSchema = z.object({
  identifier: z.string().trim().min(1, { message: "Masukkan email atau username." }),
  password: z.string().min(1, { message: "Masukkan kata sandi." }),
});

type LoginFormValues = z.infer<typeof formSchema>;

export function LoginForm() {
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const onSubmit = (values: LoginFormValues) => {
    setErrorMessage(undefined);
    const formData = new FormData();
    formData.set("identifier", values.identifier);
    formData.set("password", values.password);

    startTransition(async () => {
      const result = await signIn(formData);
      if (result.error) {
        setErrorMessage(result.error);
      }
    });
  };

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FieldGroup className="gap-4">
        <Controller
          control={form.control}
          name="identifier"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="login-identifier">Email atau username</FieldLabel>
              <Input
                {...field}
                id="login-identifier"
                type="text"
                placeholder="nama@contoh.com atau username"
                autoComplete="username"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="login-password">Kata sandi</FieldLabel>
              <Input
                {...field}
                id="login-password"
                type="password"
                placeholder="Masukkan kata sandi"
                autoComplete="current-password"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>
      {errorMessage && <p className="text-destructive text-sm">{errorMessage}</p>}
      <Button className="w-full" type="submit" disabled={isPending}>
        {isPending ? "Memproses..." : "Masuk"}
      </Button>
    </form>
  );
}
