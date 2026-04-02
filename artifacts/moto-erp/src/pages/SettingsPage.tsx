import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Moon, Sun, User, Lock, Palette, Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const isRtl = i18n.language === "ar";

  const changePasswordMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/users/${user?.id}/password`, {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
    onSuccess: () => {
      toast.success(isRtl ? "تم تغيير كلمة المرور بنجاح" : "Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: Error) => {
      toast.error(err?.message ?? (isRtl ? "فشل تغيير كلمة المرور" : "Failed to change password"));
    },
  });

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(isRtl ? "كلمتا المرور الجديدتان لا تتطابقان" : "New passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error(isRtl ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters");
      return;
    }
    changePasswordMutation.mutate();
  }

  const toggleLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("settings.title")}</h1>
        <p className="text-muted-foreground">{t("settings.subtitle")}</p>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-orange-500" />
            <CardTitle>{t("settings.account")}</CardTitle>
          </div>
          <CardDescription>{t("settings.currentUser")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("users.username")}</Label>
              <p className="font-medium">{user?.username}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("users.fullName")}</Label>
              <p className="font-medium">{user?.fullName}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("settings.role")}</Label>
              <Badge variant="secondary" className="uppercase text-xs">{user?.role}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Languages className="h-4 w-4 text-orange-500" />
            <CardTitle>{t("settings.language")}</CardTitle>
          </div>
          <CardDescription>{t("settings.languageSelect")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button
              variant={i18n.language === "en" ? "default" : "outline"}
              onClick={() => toggleLanguage("en")}
              className={i18n.language === "en" ? "bg-orange-500 hover:bg-orange-600" : ""}
            >
              🇬🇧 {t("common.english")}
            </Button>
            <Button
              variant={i18n.language === "ar" ? "default" : "outline"}
              onClick={() => toggleLanguage("ar")}
              className={`font-arabic ${i18n.language === "ar" ? "bg-orange-500 hover:bg-orange-600" : ""}`}
            >
              🇸🇦 {t("common.arabic")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-orange-500" />
            <CardTitle>{t("settings.changePassword")}</CardTitle>
          </div>
          <CardDescription>{t("settings.changePassword")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">{t("settings.currentPassword")}</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                dir="ltr"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t("settings.newPassword")}</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                dir="ltr"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("settings.confirmPassword")}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                dir="ltr"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={changePasswordMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {changePasswordMutation.isPending ? t("common.loading") : t("settings.saveChanges")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-orange-500" />
            <CardTitle>{t("settings.appearance")}</CardTitle>
          </div>
          <CardDescription>{t("settings.theme")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t("settings.theme")}</p>
              <p className="text-sm text-muted-foreground">
                {theme === "dark" ? t("settings.themeDark") : t("settings.themeLight")}
              </p>
            </div>
            <Button variant="outline" onClick={toggleTheme}>
              {theme === "dark" ? (
                <span className="flex items-center gap-2">
                  <Sun className="h-4 w-4 text-yellow-400" /> {t("settings.themeLight")}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Moon className="h-4 w-4" /> {t("settings.themeDark")}
                </span>
              )}
            </Button>
          </div>

          <Separator className="my-4" />

          <div className="space-y-1 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{t("settings.systemInfo")}</p>
            <p>Currency: Malaysian Ringgit (RM)</p>
            <p>{t("settings.version")}: 1.0.0</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
