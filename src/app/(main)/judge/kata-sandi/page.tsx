import { ChangePasswordForm } from "@/components/change-password-form";

export const metadata = {
  title: "Ganti Kata Sandi | Juri",
};

export default function JudgeChangePasswordPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-semibold text-2xl">Ganti Kata Sandi</h1>
        <p className="text-muted-foreground">Perbarui kata sandi akun juri.</p>
      </div>
      <ChangePasswordForm />
    </div>
  );
}
