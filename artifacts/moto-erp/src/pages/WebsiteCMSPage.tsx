import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Globe, MessageSquare, Mail, Phone, MapPin, Save, Eye, EyeOff, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";

type SiteSettings = Record<string, string>;

type ContactSubmission = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  subject: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
};

function SettingField({
  label,
  settingKey,
  value,
  type = "text",
  onChange,
  multiline = false,
}: {
  label: string;
  settingKey: string;
  value: string;
  type?: string;
  onChange: (key: string, val: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</Label>
      {multiline ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(settingKey, e.target.value)}
          rows={3}
          className="text-sm"
          dir={settingKey.endsWith("_ar") ? "rtl" : undefined}
        />
      ) : (
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(settingKey, e.target.value)}
          className="text-sm"
          dir={settingKey.endsWith("_ar") ? "rtl" : undefined}
        />
      )}
    </div>
  );
}

export default function WebsiteCMSPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const qc = useQueryClient();

  const [selectedMessage, setSelectedMessage] = useState<ContactSubmission | null>(null);
  const [localSettings, setLocalSettings] = useState<SiteSettings | null>(null);

  const { data: settings, isLoading: settingsLoading } = useQuery<SiteSettings>({
    queryKey: ["site-settings"],
    queryFn: () => apiFetch("/site/settings"),
  });

  const { data: submissions, isLoading: submissionsLoading } = useQuery<ContactSubmission[]>({
    queryKey: ["contact-submissions"],
    queryFn: () => apiFetch("/site/contact/submissions"),
  });

  const saveMutation = useMutation({
    mutationFn: (updates: SiteSettings) =>
      apiFetch("/site/settings", { method: "PUT", body: JSON.stringify(updates) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success(isRtl ? "تم حفظ الإعدادات بنجاح" : "Settings saved successfully");
    },
    onError: () => toast.error(isRtl ? "فشل حفظ الإعدادات" : "Failed to save settings"),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/site/contact/submissions/${id}/read`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contact-submissions"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/site/contact/submissions/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contact-submissions"] });
      setSelectedMessage(null);
      toast.success(isRtl ? "تم حذف الرسالة" : "Message deleted");
    },
  });

  const current = localSettings ?? settings ?? {};

  const handleChange = (key: string, val: string) => {
    setLocalSettings((prev) => ({ ...(prev ?? current), [key]: val }));
  };

  const handleSave = () => {
    if (!localSettings) return;
    saveMutation.mutate(localSettings);
  };

  const handleView = (msg: ContactSubmission) => {
    setSelectedMessage(msg);
    if (!msg.isRead) markReadMutation.mutate(msg.id);
  };

  const unreadCount = submissions?.filter((s) => !s.isRead).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6 text-orange-500" />
            {isRtl ? "إدارة الموقع الإلكتروني" : "Website Management"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isRtl ? "تحكم في محتوى الموقع العام ورسائل العملاء" : "Control public website content and customer messages"}
          </p>
        </div>
      </div>

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings">
            <Globe className="h-4 w-4 mr-2" />
            {isRtl ? "إعدادات الموقع" : "Site Settings"}
          </TabsTrigger>
          <TabsTrigger value="messages" className="relative">
            <MessageSquare className="h-4 w-4 mr-2" />
            {isRtl ? "رسائل العملاء" : "Contact Messages"}
            {unreadCount > 0 && (
              <Badge className="ml-2 h-5 px-1.5 text-[10px] bg-orange-500 text-white">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Site Settings */}
        <TabsContent value="settings" className="space-y-6 mt-4">
          {settingsLoading ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <>
              {/* Hero Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{isRtl ? "قسم الترحيب (Hero)" : "Hero Section"}</CardTitle>
                  <CardDescription>{isRtl ? "نصوص الصفحة الرئيسية" : "Homepage hero text and image"}</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SettingField label={isRtl ? "العنوان (عربي)" : "Title (Arabic)"} settingKey="hero_title_ar" value={current.hero_title_ar ?? ""} onChange={handleChange} />
                  <SettingField label={isRtl ? "العنوان (إنجليزي)" : "Title (English)"} settingKey="hero_title_en" value={current.hero_title_en ?? ""} onChange={handleChange} />
                  <SettingField label={isRtl ? "الوصف (عربي)" : "Subtitle (Arabic)"} settingKey="hero_subtitle_ar" value={current.hero_subtitle_ar ?? ""} onChange={handleChange} multiline />
                  <SettingField label={isRtl ? "الوصف (إنجليزي)" : "Subtitle (English)"} settingKey="hero_subtitle_en" value={current.hero_subtitle_en ?? ""} onChange={handleChange} multiline />
                  <div className="md:col-span-2">
                    <SettingField label={isRtl ? "رابط صورة الهيرو" : "Hero Image URL"} settingKey="hero_image_url" value={current.hero_image_url ?? ""} onChange={handleChange} />
                  </div>
                </CardContent>
              </Card>

              {/* Company Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{isRtl ? "معلومات الشركة" : "Company Info"}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SettingField label={isRtl ? "اسم الشركة (عربي)" : "Company Name (Arabic)"} settingKey="company_name_ar" value={current.company_name_ar ?? ""} onChange={handleChange} />
                  <SettingField label={isRtl ? "اسم الشركة (إنجليزي)" : "Company Name (English)"} settingKey="company_name_en" value={current.company_name_en ?? ""} onChange={handleChange} />
                  <SettingField label={isRtl ? "البريد الإلكتروني" : "Email"} settingKey="email" value={current.email ?? ""} onChange={handleChange} type="email" />
                  <SettingField label={isRtl ? "رقم الهاتف" : "Phone"} settingKey="phone" value={current.phone ?? ""} onChange={handleChange} />
                  <SettingField label={isRtl ? "العنوان (عربي)" : "Address (Arabic)"} settingKey="address_ar" value={current.address_ar ?? ""} onChange={handleChange} multiline />
                  <SettingField label={isRtl ? "العنوان (إنجليزي)" : "Address (English)"} settingKey="address_en" value={current.address_en ?? ""} onChange={handleChange} multiline />
                </CardContent>
              </Card>

              {/* About Us */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{isRtl ? "صفحة من نحن" : "About Us Page"}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SettingField label={isRtl ? "العنوان (عربي)" : "Title (Arabic)"} settingKey="about_title_ar" value={current.about_title_ar ?? ""} onChange={handleChange} />
                  <SettingField label={isRtl ? "العنوان (إنجليزي)" : "Title (English)"} settingKey="about_title_en" value={current.about_title_en ?? ""} onChange={handleChange} />
                  <SettingField label={isRtl ? "النص (عربي)" : "Text (Arabic)"} settingKey="about_text_ar" value={current.about_text_ar ?? ""} onChange={handleChange} multiline />
                  <SettingField label={isRtl ? "النص (إنجليزي)" : "Text (English)"} settingKey="about_text_en" value={current.about_text_en ?? ""} onChange={handleChange} multiline />
                </CardContent>
              </Card>

              {/* App & WhatsApp Links */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{isRtl ? "روابط التطبيق والتواصل" : "App & Contact Links"}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SettingField label={isRtl ? "رقم واتساب" : "WhatsApp Number"} settingKey="whatsapp_number" value={current.whatsapp_number ?? ""} onChange={handleChange} />
                  <SettingField label={isRtl ? "خرائط جوجل (iframe)" : "Google Maps Embed (iframe src)"} settingKey="google_maps_embed" value={current.google_maps_embed ?? ""} onChange={handleChange} />
                  <SettingField label={isRtl ? "رابط Google Play" : "Google Play URL"} settingKey="google_play_url" value={current.google_play_url ?? ""} onChange={handleChange} type="url" />
                  <SettingField label={isRtl ? "رابط App Store" : "App Store URL"} settingKey="app_store_url" value={current.app_store_url ?? ""} onChange={handleChange} type="url" />
                </CardContent>
              </Card>

              {/* Social Media */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{isRtl ? "روابط التواصل الاجتماعي" : "Social Media Links"}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SettingField label="Facebook" settingKey="facebook_url" value={current.facebook_url ?? ""} onChange={handleChange} type="url" />
                  <SettingField label="Instagram" settingKey="instagram_url" value={current.instagram_url ?? ""} onChange={handleChange} type="url" />
                  <SettingField label="Twitter / X" settingKey="twitter_url" value={current.twitter_url ?? ""} onChange={handleChange} type="url" />
                  <SettingField label="YouTube" settingKey="youtube_url" value={current.youtube_url ?? ""} onChange={handleChange} type="url" />
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className="bg-orange-500 hover:bg-orange-600 gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saveMutation.isPending
                    ? (isRtl ? "جارٍ الحفظ..." : "Saving...")
                    : (isRtl ? "حفظ الإعدادات" : "Save Settings")}
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        {/* Contact Messages */}
        <TabsContent value="messages" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base">{isRtl ? "الرسائل الواردة" : "Incoming Messages"}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {submissionsLoading ? (
                  <div className="p-4 space-y-2">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                  </div>
                ) : !submissions?.length ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    {isRtl ? "لا توجد رسائل بعد" : "No messages yet"}
                  </div>
                ) : (
                  <div className="divide-y">
                    {submissions.map((msg) => (
                      <button
                        key={msg.id}
                        onClick={() => handleView(msg)}
                        className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${selectedMessage?.id === msg.id ? "bg-orange-50 dark:bg-orange-950/20" : ""}`}
                      >
                        <div className="flex items-center gap-2">
                          {!msg.isRead && <div className="h-2 w-2 rounded-full bg-orange-500 flex-shrink-0" />}
                          <span className={`font-medium text-sm ${!msg.isRead ? "font-semibold" : ""}`}>{msg.name}</span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {new Date(msg.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5 pl-4">
                          {msg.subject || msg.message}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-1">
              {selectedMessage ? (
                <>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">{selectedMessage.name}</CardTitle>
                        {selectedMessage.subject && (
                          <CardDescription className="mt-0.5">{selectedMessage.subject}</CardDescription>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700 h-8 w-8"
                        onClick={() => { if (confirm(isRtl ? "حذف الرسالة؟" : "Delete message?")) deleteMutation.mutate(selectedMessage.id); }}
                      >
                        <span className="text-xs">✕</span>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {selectedMessage.email && (
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{selectedMessage.email}</span>
                      )}
                      {selectedMessage.phone && (
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{selectedMessage.phone}</span>
                      )}
                      <span>{new Date(selectedMessage.createdAt).toLocaleString()}</span>
                    </div>
                    <Separator />
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedMessage.message}</p>
                    {selectedMessage.email && (
                      <Button variant="outline" size="sm" className="gap-1" asChild>
                        <a href={`mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject || ""}`}>
                          <Mail className="h-3 w-3" />
                          {isRtl ? "رد بالبريد" : "Reply via Email"}
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </>
              ) : (
                <CardContent className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                  {isRtl ? "اختر رسالة لعرضها" : "Select a message to view"}
                </CardContent>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
