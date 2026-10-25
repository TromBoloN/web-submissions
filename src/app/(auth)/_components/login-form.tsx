"use client";

import { useState, useTransition } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { signIn } from "@/lib/auth-actions";

const formSchema = z.object({
  identifier: z.string().trim().min(1, { message: "Masukkan email atau username." }),
  password: z.string().min(1, { message: "Masukkan kata sandi." }),
});

type LoginFormValues = z.infer<typeof formSchema>;

export function LoginForm() {
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
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
                className="h-10"
                placeholder="nama@contoh.com atau username"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
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
              <InputGroup className="h-10">
                <InputGroupInput
                  {...field}
                  id="login-password"
                  type={isPasswordVisible ? "text" : "password"}
                  className="h-full text-base md:text-sm"
                  placeholder="Masukkan kata sandi"
                  autoComplete="current-password"
                  aria-invalid={fieldState.invalid}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-sm"
                    onClick={() => setIsPasswordVisible((visible) => !visible)}
                    aria-label={isPasswordVisible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    aria-pressed={isPasswordVisible}
                    aria-controls="login-password"
                  >
                    {isPasswordVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>
      {errorMessage && <p className="text-destructive text-sm">{errorMessage}</p>}
      <Button className="h-10 w-full" type="submit" disabled={isPending}>
        {isPending && <Spinner className="size-4" />}
        {isPending ? "Memproses..." : "Masuk"}
      </Button>
    </form>
  );
}
