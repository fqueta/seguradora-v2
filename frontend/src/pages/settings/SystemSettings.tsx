import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  Settings, 
  Save, 
  Palette, 
  Link, 
  Image as ImageIcon, 
  Building2, 
  Loader2, 
  Monitor, 
  Zap, 
  ShieldCheck, 
  Globe, 
  Server, 
  Database, 
  Archive,
  MousePointer2,
  Moon,
  Sun,
  Maximize2
} from "lucide-react";
import { getInstitutionName, getInstitutionSlogan, getInstitutionDescription, getInstitutionUrl } from "@/lib/branding";
import { systemSettingsService, AdvancedSystemSettings } from "@/services/systemSettingsService";
import { useApiOptions } from "@/hooks/useApiOptions";
import { useFunnelsList, useStagesList } from "@/hooks/funnels";
import { fileStorageService, type FileStorageItem, extractFileStorageUrl } from "@/services/fileStorageService";
import { ImageUpload } from "@/components/lib/ImageUpload";
import { SulAmericaSettingsCard } from "@/components/settings/SulAmericaSettingsCard";
import { useTheme } from "@/contexts/ThemeContext";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Página de configurações do sistema
 * Contém duas abas: Configurações Básicas e Configurações Avançadas
 * Cada aba possui cards com diferentes tipos de configurações
 */
export default function SystemSettings() {
  // Estado da aba ativa
  const [activeTab, setActiveTab] = useState("basic");
  
  // Estado de carregamento
  const [isLoading, setIsLoading] = useState(false);
  
  // Hook para gerenciar opções da API
  const { 
    options: apiOptions, 
    isLoading: apiLoading, 
    error: apiError, 
    updateOption, 
    saveMultipleOptions, 
    getApiConfigOptions 
  } = useApiOptions();

  const { applyThemeSettings } = useTheme();
  
  // Estado local para as configurações de API (antes de salvar)
  const [localApiOptions, setLocalApiOptions] = useState<{[key: number]: string}>({});

  const getCurrentOptionValue = (option: any) => {
    return localApiOptions[option.id] !== undefined ? localApiOptions[option.id] : option.value;
  };

  const { data: funnelsData, isLoading: isLoadingFunnels } = useFunnelsList({ per_page: 200 });
  const salesFunnels = React.useMemo(() => {
    const list: any[] = (funnelsData?.data || (funnelsData as any)?.items || []);
    return list.filter((f) => String(f?.settings?.place || '').toLowerCase() === 'vendas');
  }, [funnelsData]);

  const defaultFunnelOption = React.useMemo(() => (
    (apiOptions || []).find((o: any) => o.url === 'default_funil_vendas_id') || null
  ), [apiOptions]);

  const defaultStageOption = React.useMemo(() => (
    (apiOptions || []).find((o: any) => o.url === 'default_etapa_vendas_id') || null
  ), [apiOptions]);

  const selectedDefaultFunnelId = React.useMemo(() => (
    defaultFunnelOption ? String(getCurrentOptionValue(defaultFunnelOption) || '') : ''
  ), [defaultFunnelOption, localApiOptions]);

  const { data: stagesData, isLoading: isLoadingStages } = useStagesList(String(selectedDefaultFunnelId || ''), { per_page: 200 }, { enabled: !!selectedDefaultFunnelId });
  const stagesForDefaultFunnel = React.useMemo(() => (
    stagesData?.data || (stagesData as any)?.items || []
  ), [stagesData]);

  const [basicSwitchSettings, setBasicSwitchSettings] = useState(() => {
    const saved = localStorage.getItem('basicSwitchSettings');
    return saved ? JSON.parse(saved) : {
      enableNotifications: true,
      enableAutoBackup: false,
      enableMaintenanceMode: false,
      enableDebugMode: false,
    };
  });

  const [basicSelectSettings, setBasicSelectSettings] = useState(() => {
    const saved = localStorage.getItem('basicSelectSettings');
    return saved ? JSON.parse(saved) : {
      defaultLanguage: "pt-BR",
      timezone: "America/Sao_Paulo",
      dateFormat: "DD/MM/YYYY",
      currency: "BRL",
    };
  });

  const [appearanceSettings, setAppearanceSettings] = useState(() => {
    const saved = localStorage.getItem('appearanceSettings');
    return saved ? JSON.parse(saved) : {
      darkMode: false,
      primaryColor: "#0b217b",
      secondaryColor: "#4b89cd",
      fontSize: "medium",
      theme: "default",
      compactMode: true,
      showAnimations: true,
    };
  });

  const [appearanceHydratedFromDb, setAppearanceHydratedFromDb] = useState(false);

  const [advancedSwitchSettings, setAdvancedSwitchSettings] = useState({
    enableApiLogging: true,
    enableCaching: true,
    enableCompression: false,
    enableSslRedirect: true,
  });

  const [advancedSelectSettings, setAdvancedSelectSettings] = useState({
    logLevel: "info",
    cacheDriver: "redis",
    sessionDriver: "database",
    queueDriver: "sync",
  });

  const [advancedInputSettings, setAdvancedInputSettings] = useState({
    maxFileSize: "",
    sessionTimeout: "",
    apiRateLimit: "",
    maxConnections: "",
    backupRetention: "",
    url_api_aeroclube: "",
    token_api_aeroclube: "",
  });

  const handleBasicSwitchChange = (key: string, value: boolean) => {
    const newSettings = { ...basicSwitchSettings, [key]: value };
    setBasicSwitchSettings(newSettings);
    localStorage.setItem('basicSwitchSettings', JSON.stringify(newSettings));
    applySystemSettings(newSettings);
  };

  const handleBasicSelectChange = (key: string, value: string) => {
    const newSettings = { ...basicSelectSettings, [key]: value };
    setBasicSelectSettings(newSettings);
    localStorage.setItem('basicSelectSettings', JSON.stringify(newSettings));
  };

  const handleAppearanceChange = (key: string, value: string | boolean) => {
    const newSettings = { ...appearanceSettings, [key]: value };
    setAppearanceSettings(newSettings);
    localStorage.setItem('appearanceSettings', JSON.stringify(newSettings));
    applyThemeSettings();
  };

  const [brandingLogoUrl, setBrandingLogoUrl] = useState<string | null>(() => {
    try { return (localStorage.getItem('app_logo_url') || '').trim() || null; } catch { return null; }
  });
  const [brandingFaviconUrl, setBrandingFaviconUrl] = useState<string | null>(() => {
    try { return (localStorage.getItem('app_favicon_url') || '').trim() || null; } catch { return null; }
  });
  const [brandingSocialUrl, setBrandingSocialUrl] = useState<string | null>(() => {
    try { return (localStorage.getItem('app_social_image_url') || '').trim() || null; } catch { return null; }
  });

  const [institutionName, setInstitutionName] = useState<string>(() => getInstitutionName());
  const [institutionSlogan, setInstitutionSlogan] = useState<string>(() => getInstitutionSlogan());
  const [institutionDescription, setInstitutionDescription] = useState<string>(() => getInstitutionDescription());
  const [institutionUrl, setInstitutionUrl] = useState<string>(() => getInstitutionUrl());

  useEffect(() => {
    try {
      const logo = (localStorage.getItem('app_logo_url') || '').trim();
      const fav = (localStorage.getItem('app_favicon_url') || '').trim();
      const soc = (localStorage.getItem('app_social_image_url') || '').trim();
      const inst = (localStorage.getItem('app_institution_name') || '').trim();
      const needLogo = !logo && !brandingLogoUrl;
      const needFav = !fav && !brandingFaviconUrl;
      const needSoc = !soc && !brandingSocialUrl;
      const needInst = !inst;
      if (!(needLogo || needFav || needSoc || needInst)) return;
      const getOpt = (key: string) => (apiOptions || []).find((o: any) => String(o?.url || '') === key);
      const getOptByKeys = (keys: string[]) => {
        for (const k of keys) {
          const found = getOpt(k);
          if (found) return found;
        }
        return null;
      };
      if (needLogo) {
        const o = getOpt('app_logo_url');
        const val = (o && (o.value ?? o.current_value ?? '')) || '';
        const v = String(val).trim();
        if (v) {
          setBrandingLogoUrl(v);
          try { localStorage.setItem('app_logo_url', v); } catch {}
          (window as any).__APP_LOGO_URL__ = v;
        }
      }
      if (needFav) {
        const o = getOpt('app_favicon_url');
        const val = (o && (o.value ?? o.current_value ?? '')) || '';
        const v = String(val).trim();
        if (v) {
          setBrandingFaviconUrl(v);
          try { localStorage.setItem('app_favicon_url', v); } catch {}
          (window as any).__APP_FAVICON_URL__ = v;
        }
      }
      if (needSoc) {
        const o = getOpt('app_social_image_url');
        const val = (o && (o.value ?? o.current_value ?? '')) || '';
        const v = String(val).trim();
        if (v) {
          setBrandingSocialUrl(v);
          try { localStorage.setItem('app_social_image_url', v); } catch {}
          (window as any).__APP_SOCIAL_IMAGE_URL__ = v;
        }
      }
      if (needInst) {
        const o = getOptByKeys(['app_institution_name', 'site_name', 'app_name']);
        const val = (o && (o.value ?? o.current_value ?? '')) || '';
        const v = String(val).trim();
        if (v) {
          try { localStorage.setItem('app_institution_name', v); } catch {}
          const anyWin = window as any;
          anyWin.__APP_INSTITUTION_NAME__ = v;
          anyWin.__APP_SITE_NAME__ = anyWin.__APP_SITE_NAME__ || v;
          anyWin.__APP_APP_NAME__ = anyWin.__APP_APP_NAME__ || v;
          setInstitutionName(v);
        }
      }
      const optSlogan = getOptByKeys(['app_institution_slogan']);
      const valSlogan = (optSlogan && (optSlogan.value ?? optSlogan.current_value ?? '')) || '';
      if (String(valSlogan).trim()) {
        const s = String(valSlogan).trim();
        try { localStorage.setItem('app_institution_slogan', s); } catch {}
        (window as any).__APP_INSTITUTION_SLOGAN__ = s;
        setInstitutionSlogan(s);
      }
      const optDesc = getOptByKeys(['app_institution_description']);
      const valDesc = (optDesc && (optDesc.value ?? optDesc.current_value ?? '')) || '';
      if (String(valDesc).trim()) {
        const d = String(valDesc).trim();
        try { localStorage.setItem('app_institution_description', d); } catch {}
        (window as any).__APP_INSTITUTION_DESCRIPTION__ = d;
        setInstitutionDescription(d);
      }
      const optUrl = getOptByKeys(['app_institution_url']);
      const valUrl = (optUrl && (optUrl.value ?? optUrl.current_value ?? '')) || '';
      if (String(valUrl).trim()) {
        const u = String(valUrl).trim();
        try { localStorage.setItem('app_institution_url', u); } catch {}
        (window as any).__APP_INSTITUTION_URL__ = u;
        setInstitutionUrl(u);
      }
    } catch {}
  }, [apiOptions]);

  async function handleSaveInstitution() {
    setIsLoading(true);
    try {
      const v = (institutionName || '').trim();
      if (!v) {
        toast.warning('Informe um nome de instituição válido.');
        return;
      }
      try { localStorage.setItem('app_institution_name', v); } catch {}
      const anyWin = window as any;
      anyWin.__APP_INSTITUTION_NAME__ = v;
      anyWin.__APP_SITE_NAME__ = anyWin.__APP_SITE_NAME__ || v;
      anyWin.__APP_APP_NAME__ = anyWin.__APP_APP_NAME__ || v;

      const s = (institutionSlogan || '').trim();
      const d = (institutionDescription || '').trim();
      const u = (institutionUrl || '').trim();
      if (s) { try { localStorage.setItem('app_institution_slogan', s); } catch {} anyWin.__APP_INSTITUTION_SLOGAN__ = s; }
      if (d) { try { localStorage.setItem('app_institution_description', d); } catch {} anyWin.__APP_INSTITUTION_DESCRIPTION__ = d; }
      if (u) { try { localStorage.setItem('app_institution_url', u); } catch {} anyWin.__APP_INSTITUTION_URL__ = u; }

      const ok = await saveMultipleOptions({ 
        app_institution_name: v,
        ...(s ? { app_institution_slogan: s } : {}),
        ...(d ? { app_institution_description: d } : {}),
        ...(u ? { app_institution_url: u } : {}),
      });
      if (ok) {
        toast.success('Identidade institucional salva!');
      } else {
        toast.warning('Salvo localmente; falha ao persistir na API.');
      }
    } catch (error: any) {
      toast.error(`Falha ao salvar: ${error?.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUploadGeneric(file: File, meta?: Record<string, any>): Promise<string> {
    const resp: any = await fileStorageService.upload<any>(file, { active: true, ...meta });
    const url = extractFileStorageUrl(resp);
    if (!url) throw new Error('URL não retornada.');
    return url;
  }

  async function handleUploadLogo(file: File): Promise<string> {
    const url = await handleUploadGeneric(file, { title: 'logo', name: 'app-logo' });
    setBrandingLogoUrl(url);
    return url;
  }

  async function handleUploadFavicon(file: File): Promise<string> {
    const url = await handleUploadGeneric(file, { title: 'favicon', name: 'app-favicon' });
    setBrandingFaviconUrl(url);
    return url;
  }

  async function handleUploadSocial(file: File): Promise<string> {
    const url = await handleUploadGeneric(file, { title: 'social-image', name: 'app-social-image' });
    setBrandingSocialUrl(url);
    return url;
  }

  async function handleSaveBranding() {
    setIsLoading(true);
    const payload: Record<string, string> = {};
    if (brandingLogoUrl) payload['app_logo_url'] = brandingLogoUrl;
    if (brandingFaviconUrl) payload['app_favicon_url'] = brandingFaviconUrl;
    if (brandingSocialUrl) payload['app_social_image_url'] = brandingSocialUrl;

    try {
      Object.entries(payload).forEach(([k, v]) => localStorage.setItem(k, v));
      if (Object.keys(payload).length > 0) {
        await saveMultipleOptions(payload);
      }
      toast.success('Branding atualizado com sucesso!');
    } catch (error: any) {
      toast.error(`Erro ao salvar branding: ${error?.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  const applySystemSettings = (settings: typeof basicSwitchSettings) => {
    if (settings.enableMaintenanceMode) {
      document.body.classList.add('maintenance-mode');
    } else {
      document.body.classList.remove('maintenance-mode');
    }
  };

  const handleSaveAppearanceSettings = async () => {
    setIsLoading(true);
    try {
      const ok = await saveMultipleOptions({
        ui_primary_color: String(appearanceSettings.primaryColor || '').trim(),
        ui_secondary_color: String(appearanceSettings.secondaryColor || '').trim(),
      });
      if (ok) {
        localStorage.setItem('appearanceSettings', JSON.stringify(appearanceSettings));
        applyThemeSettings();
        toast.success('Aparência aplicada globalmente!');
      }
    } catch (e) {
      toast.error('Erro ao salvar aparência.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (appearanceHydratedFromDb) return;
    if (!apiOptions || apiOptions.length === 0) return;
    const findOpt = (key: string) => (apiOptions as any[]).find((o) => String(o?.url || '') === key);
    const primary = String(findOpt('ui_primary_color')?.value || '').trim();
    const secondary = String(findOpt('ui_secondary_color')?.value || '').trim();
    const isHex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v);
    const saved = localStorage.getItem('appearanceSettings');
    const current = saved ? JSON.parse(saved) : {};
    const next = {
      darkMode: false,
      primaryColor: "#0b217b",
      secondaryColor: "#4b89cd",
      fontSize: "medium",
      theme: "default",
      compactMode: true,
      showAnimations: true,
      ...current,
      ...(isHex(primary) ? { primaryColor: primary } : {}),
      ...(isHex(secondary) ? { secondaryColor: secondary } : {}),
    };
    setAppearanceSettings(next);
    localStorage.setItem('appearanceSettings', JSON.stringify(next));
    applyThemeSettings();
    setAppearanceHydratedFromDb(true);
  }, [apiOptions, appearanceHydratedFromDb]);

  const handleApiOptionChange = (id: number, value: string) => {
    setLocalApiOptions(prev => ({ ...prev, [id]: value }));
  };

  const handleSaveApiSettings = async () => {
    setIsLoading(true);
    try {
      const dataToSave: {[key: string]: string} = {};
      getApiConfigOptions().forEach((option) => {
        dataToSave[option.url] = getCurrentOptionValue(option) || '';
      });
      const success = await saveMultipleOptions(dataToSave);
      if (success) toast.success('Configurações de API salvas!');
    } catch (error) {
      toast.error('Erro ao salvar API settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveFunctionalityOptions = async () => {
    setIsLoading(true);
    try {
      const dataToSave: { [key: string]: string } = {};
      (apiOptions || []).forEach((option: any) => {
        dataToSave[option.url] = getCurrentOptionValue(option) || '';
      });
      const success = await saveMultipleOptions(dataToSave);
      if (success) toast.success('Configurações salvas!');
    } catch (error) {
      toast.error('Erro ao salvar configurações.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveGeneralSettings = () => {
    localStorage.setItem('basicSwitchSettings', JSON.stringify(basicSwitchSettings));
    applySystemSettings(basicSwitchSettings);
    toast.success('Configurações gerais salvas!');
  };

  const handleSaveSystemPreferences = () => {
    localStorage.setItem('basicSelectSettings', JSON.stringify(basicSelectSettings));
    toast.success('Preferências do sistema salvas!');
  };

  const handleAdvancedSwitchChange = (key: string, value: boolean) => {
    setAdvancedSwitchSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleAdvancedSelectChange = (key: string, value: string) => {
    setAdvancedSelectSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleAdvancedInputChange = (key: string, value: string) => {
    setAdvancedInputSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      const advancedSettings: AdvancedSystemSettings = {
        ...advancedSwitchSettings,
        ...advancedSelectSettings,
        ...advancedInputSettings,
      };
      await systemSettingsService.saveAdvancedSettings(advancedSettings);
      toast.success("Configurações avançadas salvas!");
    } catch (error) {
      toast.error("Erro ao salvar avançado.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadAdvancedSettings = async () => {
    try {
      setIsLoading(true);
      const data = await systemSettingsService.getAdvancedSettings('/options');
      setAdvancedInputSettings({
        maxFileSize: data.maxFileSize || "",
        sessionTimeout: data.sessionTimeout || "",
        apiRateLimit: data.apiRateLimit || "",
        maxConnections: data.maxConnections || "",
        backupRetention: data.backupRetention || "",
        url_api_aeroclube: data.url_api_aeroclube || "",
        token_api_aeroclube: data.token_api_aeroclube || "",
      });
      if (data.enableApiLogging !== undefined) {
        setAdvancedSwitchSettings({
          enableApiLogging: data.enableApiLogging,
          enableCaching: data.enableCaching,
          enableCompression: data.enableCompression,
          enableSslRedirect: data.enableSslRedirect,
        });
      }
      if (data.logLevel) {
        setAdvancedSelectSettings({
          logLevel: data.logLevel,
          cacheDriver: data.cacheDriver,
          sessionDriver: data.sessionDriver,
          queueDriver: data.queueDriver,
        });
      }
    } catch (error) {
      console.error('Load Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdvancedSettings();
  }, []);

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Premium */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Settings className="h-6 w-6 text-primary" />
            </div>
            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest py-0.5 border-primary/20 bg-primary/5 text-primary">
              Core Engine
            </Badge>
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Painel de Controle</h1>
          <p className="text-muted-foreground mt-1 font-medium italic">Configure os parâmetros neurais e visuais da sua plataforma.</p>
        </div>

        {activeTab === "advanced" && (
          <Button 
            onClick={handleSaveSettings} 
            disabled={isLoading}
            className="h-14 px-8 rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 gap-3 transition-all hover:scale-[1.02] active:scale-95"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            Salvar Tudo
          </Button>
        )}
      </div>

      <Tabs defaultValue="basic" className="w-full space-y-10" onValueChange={setActiveTab}>
        {/* Tabs Customizada Estilo Glassmorphism */}
        <div className="bg-white/50 backdrop-blur-md p-1.5 rounded-[2rem] border border-gray-100 shadow-sm max-w-2xl mx-auto">
          <TabsList className="grid w-full grid-cols-3 bg-transparent h-12">
            <TabsTrigger 
              value="basic" 
              className="rounded-[1.5rem] data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary font-black uppercase tracking-tighter text-[11px] transition-all"
            >
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                <span>Básico</span>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="advanced" 
              className="rounded-[1.5rem] data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary font-black uppercase tracking-tighter text-[11px] transition-all"
            >
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span>Avançado</span>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="api" 
              className="rounded-[1.5rem] data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary font-black uppercase tracking-tighter text-[11px] transition-all"
            >
              <div className="flex items-center gap-2">
                <Link className="w-4 h-4" />
                <span>Conectividade</span>
              </div>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Aba Básica: Identidade e Aparência */}
        <TabsContent value="basic" className="space-y-10">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            
            {/* Card Aparência Redesenhado */}
            <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-gray-100/50 overflow-hidden group">
              <div className="h-2 bg-primary/10 transition-all group-hover:h-3" />
              <CardHeader className="p-8 pb-4">
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-orange-100 rounded-2xl">
                    <Palette className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black text-gray-900 tracking-tight">Design System</CardTitle>
                    <CardDescription className="font-medium">Personalize a experiência visual do sistema.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-4 space-y-8">
                
                {/* Grid de Switches de Aparência */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { id: 'darkMode', label: 'Modo Escuro', icon: <Moon className="w-4 h-4" />, help: 'Interface noturna' },
                    { id: 'compactMode', label: 'Modo Compacto', icon: <Maximize2 className="w-4 h-4" />, help: 'Densidade alta' },
                    { id: 'showAnimations', label: 'Animações', icon: <Zap className="w-4 h-4" />, help: 'Fluidez visual' }
                  ].map((s) => (
                    <div key={s.id} className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 flex items-center justify-between hover:bg-white hover:shadow-md transition-all">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 font-black text-xs text-gray-700">
                          {s.icon}
                          {s.label}
                        </div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">{s.help}</span>
                      </div>
                      <Switch 
                        checked={(appearanceSettings as any)[s.id]} 
                        onCheckedChange={(val) => handleAppearanceChange(s.id, val)}
                      />
                    </div>
                  ))}
                </div>

                {/* Seção de Cores com Visual Premium */}
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Paleta Cromática</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Primary Color Picker */}
                    <div className="space-y-3">
                      <Label className="text-xs font-black text-gray-600 px-1">Cor Primária (Marca)</Label>
                      <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 shadow-sm focus-within:ring-2 ring-primary/20 transition-all">
                        <div 
                          className="w-12 h-12 rounded-xl border border-gray-100 shadow-inner relative overflow-hidden" 
                          style={{ backgroundColor: appearanceSettings.primaryColor }}
                        >
                          <input 
                            type="color" 
                            className="absolute inset-0 opacity-0 cursor-pointer scale-150"
                            value={appearanceSettings.primaryColor}
                            onChange={(e) => handleAppearanceChange('primaryColor', e.target.value)}
                          />
                        </div>
                        <div className="flex-1 flex flex-col">
                           <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">HEX CODE</span>
                           <input 
                             className="text-sm font-black text-gray-700 bg-transparent border-none p-0 focus:ring-0 uppercase"
                             value={appearanceSettings.primaryColor}
                             onChange={(e) => handleAppearanceChange('primaryColor', e.target.value)}
                           />
                        </div>
                      </div>
                    </div>
                    {/* Secondary Color Picker */}
                    <div className="space-y-3">
                      <Label className="text-xs font-black text-gray-600 px-1">Cor Secundária (Apoio)</Label>
                      <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 shadow-sm focus-within:ring-2 ring-secondary/20 transition-all">
                        <div 
                          className="w-12 h-12 rounded-xl border border-gray-100 shadow-inner relative overflow-hidden" 
                          style={{ backgroundColor: appearanceSettings.secondaryColor }}
                        >
                          <input 
                            type="color" 
                            className="absolute inset-0 opacity-0 cursor-pointer scale-150"
                            value={appearanceSettings.secondaryColor}
                            onChange={(e) => handleAppearanceChange('secondaryColor', e.target.value)}
                          />
                        </div>
                        <div className="flex-1 flex flex-col">
                           <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">HEX CODE</span>
                           <input 
                             className="text-sm font-black text-gray-700 bg-transparent border-none p-0 focus:ring-0 uppercase"
                             value={appearanceSettings.secondaryColor}
                             onChange={(e) => handleAppearanceChange('secondaryColor', e.target.value)}
                           />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label className="text-xs font-black text-gray-600 px-1">Tema Estrutural</Label>
                    <Select value={appearanceSettings.theme} onValueChange={(val) => handleAppearanceChange('theme', val)}>
                      <SelectTrigger className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 font-bold hover:bg-white transition-all shadow-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-none shadow-2xl">
                        <SelectItem value="default" className="rounded-xl font-bold">💎 Padrão Premium</SelectItem>
                        <SelectItem value="modern" className="rounded-xl font-bold">🚀 Moderno High-Tech</SelectItem>
                        <SelectItem value="minimal" className="rounded-xl font-bold">🍃 Minimalista Puro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-xs font-black text-gray-600 px-1">Escala Tipográfica</Label>
                    <Select value={appearanceSettings.fontSize} onValueChange={(val) => handleAppearanceChange('fontSize', val)}>
                      <SelectTrigger className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 font-bold hover:bg-white transition-all shadow-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-none shadow-2xl">
                        <SelectItem value="small" className="rounded-xl font-bold">XS - Compacto</SelectItem>
                        <SelectItem value="medium" className="rounded-xl font-bold">MD - Equilibrado</SelectItem>
                        <SelectItem value="large" className="rounded-xl font-bold">LG - Acessível</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  onClick={handleSaveAppearanceSettings} 
                  disabled={isLoading}
                  className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs gap-3 shadow-lg shadow-primary/10 transition-all hover:scale-[1.01]"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Finalizar Aparência
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-8">
              {/* Card Identidade Institucional */}
              <Card className="rounded-[2.5rem] border-none shadow-xl shadow-gray-100/30 overflow-hidden">
                <CardHeader className="p-8 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-2xl">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-xl font-black tracking-tight">Cérebro da Marca</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-8 pt-4 space-y-6">
                  <div className="space-y-4">
                    <div className="flex flex-col">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Nome Principal</Label>
                      <Input 
                        value={institutionName} 
                        onChange={(e) => setInstitutionName(e.target.value)}
                        className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 font-bold text-lg focus:ring-primary shadow-inner"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Slogan Criativo</Label>
                        <Input 
                          value={institutionSlogan} 
                          onChange={(e) => setInstitutionSlogan(e.target.value)}
                          className="h-12 rounded-xl border-gray-100 bg-gray-50/50 font-bold shadow-inner"
                        />
                      </div>
                      <div className="flex flex-col">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">URL Oficial</Label>
                        <Input 
                          value={institutionUrl} 
                          onChange={(e) => setInstitutionUrl(e.target.value)}
                          className="h-12 rounded-xl border-gray-100 bg-gray-50/50 font-bold shadow-inner"
                        />
                      </div>
                    </div>
                  </div>
                  <Button onClick={handleSaveInstitution} variant="outline" className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-[10px] border-2">
                    Atualizar Identidade
                  </Button>
                </CardContent>
              </Card>

              {/* Card Branding Imagens */}
              <Card className="rounded-[2.5rem] border-none shadow-xl shadow-gray-100/30 overflow-hidden">
                <CardHeader className="p-8 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-100 rounded-2xl">
                      <ImageIcon className="h-6 w-6 text-emerald-600" />
                    </div>
                    <CardTitle className="text-xl font-black tracking-tight">Ativos de Marca</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-8 pt-4 space-y-8">
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Logo', val: brandingLogoUrl, up: handleUploadLogo, fn: setBrandingLogoUrl },
                      { label: 'Favicon', val: brandingFaviconUrl, up: handleUploadFavicon, fn: setBrandingFaviconUrl },
                      { label: 'Social', val: brandingSocialUrl, up: handleUploadSocial, fn: setBrandingSocialUrl }
                    ].map((img) => (
                      <div key={img.label} className="text-center group">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3 block">{img.label}</Label>
                        <div className="relative inline-block">
                           <ImageUpload 
                              value={img.val || ''}
                              onUpload={img.up}
                              onChange={(v) => img.fn(v || null)}
                              className="w-full aspect-square rounded-3xl overflow-hidden border-2 border-dashed border-gray-100 group-hover:border-primary/30 transition-all"
                           />
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button onClick={handleSaveBranding} variant="secondary" className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-[10px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none shadow-none">
                    Sincronizar Ativos
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Seção inferior de Preferências Gerais */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <Card className="rounded-[2.5rem] border-none shadow-lg shadow-gray-100/20">
                <CardHeader className="p-8 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-100 rounded-2xl text-slate-600">
                      <Globe className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-black tracking-tight">Preferências Regionais</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 pt-4 grid grid-cols-2 gap-4">
                   {[
                     { label: 'Idioma', val: basicSelectSettings.defaultLanguage, opts: [{v: 'pt-BR', l: 'Português'}, {v: 'en-US', l: 'English'}], fn: 'defaultLanguage' },
                     { label: 'Fuso Horário', val: basicSelectSettings.timezone, opts: [{v: 'America/Sao_Paulo', l: 'São Paulo (GMT-3)'}], fn: 'timezone' },
                     { label: 'Formato Data', val: basicSelectSettings.dateFormat, opts: [{v: 'DD/MM/YYYY', l: 'DD/MM/YYYY'}], fn: 'dateFormat' },
                     { label: 'Moeda Padrão', val: basicSelectSettings.currency, opts: [{v: 'BRL', l: 'Real (R$)'}, {v: 'USD', l: 'Dólar ($)'}], fn: 'currency' }
                   ].map((sel) => (
                     <div key={sel.label} className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">{sel.label}</Label>
                        <Select value={sel.val} onValueChange={(v) => handleBasicSelectChange(sel.fn, v)}>
                           <SelectTrigger className="h-12 rounded-xl bg-gray-50 border-gray-100 font-bold">
                              <SelectValue />
                           </SelectTrigger>
                           <SelectContent className="rounded-xl border-none shadow-2xl">
                             {sel.opts.map(o => <SelectItem key={o.v} value={o.v} className="rounded-lg">{o.l}</SelectItem>)}
                           </SelectContent>
                        </Select>
                     </div>
                   ))}
                   <Button onClick={handleSaveSystemPreferences} className="col-span-2 h-12 rounded-xl font-bold mt-2">Salvar Regionalização</Button>
                </CardContent>
             </Card>

             <Card className="rounded-[2.5rem] border-none shadow-lg shadow-gray-100/20">
                <CardHeader className="p-8 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-rose-100 rounded-2xl text-rose-600">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-lg font-black tracking-tight">Comportamento Core</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-8 pt-4 space-y-4">
                   {[
                     { id: 'enableNotifications', label: 'Central de Alertas', help: 'Push notifications de sistema' },
                     { id: 'enableAutoBackup', label: 'Backup Automático', help: 'Segurança de dados diária' },
                     { id: 'enableMaintenanceMode', label: 'Modo Manutenção', help: 'Bloqueio de acesso externo' },
                   ].map((sw) => (
                    <div key={sw.id} className="flex items-center justify-between p-3 px-4 bg-gray-50/50 rounded-2xl hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col">
                         <Label className="font-bold text-gray-700">{sw.label}</Label>
                         <span className="text-[10px] font-medium text-gray-400">{sw.help}</span>
                      </div>
                      <Switch 
                        checked={(basicSwitchSettings as any)[sw.id]} 
                        onCheckedChange={(val) => handleBasicSwitchChange(sw.id, val)} 
                      />
                    </div>
                   ))}
                   <Button onClick={handleSaveGeneralSettings} variant="outline" className="w-full h-12 rounded-xl font-bold mt-2 border-gray-200">Salvar Comportamentos</Button>
                </CardContent>
             </Card>
          </div>
        </TabsContent>

        {/* Aba Avançada: Performance e Segurança */}
        <TabsContent value="advanced" className="space-y-8 animate-in fade-in duration-500">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              <Card className="lg:col-span-2 rounded-[2.5rem] border-none shadow-xl">
                 <CardHeader className="p-8">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600">
                          <Server className="w-6 h-6" />
                       </div>
                       <CardTitle className="text-xl font-black">Infraestrutura & Low-Level</CardTitle>
                    </div>
                 </CardHeader>
                 <CardContent className="p-8 pt-0 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                       <h5 className="text-[10px] font-black uppercase tracking-widest text-primary">Drivers de Sistema</h5>
                       {[
                         { label: 'Driver de Cache', fn: 'cacheDriver', val: advancedSelectSettings.cacheDriver, opts: [{v: 'redis', l: 'Redis (Alta Performance)'}, {v: 'file', l: 'Arquivos Locais'}] },
                         { label: 'Driver de Sessão', fn: 'sessionDriver', val: advancedSelectSettings.sessionDriver, opts: [{v: 'database', l: 'Banco de Dados'}, {v: 'redis', l: 'Redis'}] },
                         { label: 'Driver de Fila', fn: 'queueDriver', val: advancedSelectSettings.queueDriver, opts: [{v: 'sync', l: 'Síncrono'}, {v: 'redis', l: 'Worker Redis'}] }
                       ].map(s => (
                         <div key={s.fn} className="space-y-2">
                           <Label className="text-xs font-bold text-gray-500 ml-1">{s.label}</Label>
                           <Select value={s.val} onValueChange={(v) => handleAdvancedSelectChange(s.fn, v)}>
                              <SelectTrigger className="h-12 rounded-2xl bg-gray-50 border-none font-bold shadow-inner">
                                 <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-2xl border-none shadow-2xl">
                                {s.opts.map(o => <SelectItem key={o.v} value={o.v} className="rounded-xl">{o.l}</SelectItem>)}
                              </SelectContent>
                           </Select>
                         </div>
                       ))}
                    </div>

                    <div className="space-y-6">
                       <h5 className="text-[10px] font-black uppercase tracking-widest text-rose-500">Limites & Políticas</h5>
                       {[
                         { label: 'Max File Size (MB)', fn: 'maxFileSize', ph: '10' },
                         { label: 'Session Timeout (min)', fn: 'sessionTimeout', ph: '120' },
                         { label: 'API Rate Limit', fn: 'apiRateLimit', ph: '1000' },
                         { label: 'Max Connections', fn: 'maxConnections', ph: '100' }
                       ].map(i => (
                         <div key={i.fn} className="space-y-2">
                           <Label className="text-xs font-bold text-gray-500 ml-1">{i.label}</Label>
                           <Input 
                             type="number"
                             value={(advancedInputSettings as any)[i.fn]} 
                             onChange={(e) => handleAdvancedInputChange(i.fn, e.target.value)}
                             placeholder={i.ph}
                             className="h-12 rounded-2xl bg-gray-50 border-none font-black shadow-inner"
                           />
                         </div>
                       ))}
                    </div>
                 </CardContent>
              </Card>

              <div className="space-y-8">
                 <Card className="rounded-[2.5rem] border-none shadow-lg bg-slate-900 text-white">
                    <CardHeader className="p-8">
                       <div className="flex items-center gap-4">
                          <div className="p-3 bg-white/10 rounded-2xl">
                             <ShieldCheck className="w-6 h-6 text-emerald-400" />
                          </div>
                          <CardTitle className="text-lg font-black uppercase tracking-tighter">Security Gates</CardTitle>
                       </div>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 space-y-4">
                       {[
                         { id: 'enableApiLogging', label: 'Monitor de Chamadas', state: advancedSwitchSettings.enableApiLogging },
                         { id: 'enableSslRedirect', label: 'Forçar HTTPS / SSL', state: advancedSwitchSettings.enableSslRedirect },
                         { id: 'enableCompression', label: 'Otimização GZIP', state: advancedSwitchSettings.enableCompression }
                       ].map(sw => (
                         <div key={sw.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                            <Label className="font-bold text-white/90 cursor-pointer">{sw.label}</Label>
                            <Switch 
                              checked={sw.state} 
                              onCheckedChange={(v) => handleAdvancedSwitchChange(sw.id, v)}
                              className="data-[state=checked]:bg-emerald-500"
                            />
                         </div>
                       ))}
                       <div className="pt-4">
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-none w-full justify-center p-2 font-black uppercase text-[10px] tracking-widest">Protocolos de Segurança Ativos</Badge>
                       </div>
                    </CardContent>
                 </Card>

                 <Card className="rounded-[2.5rem] border-none shadow-xl">
                    <CardHeader className="p-8 pb-4">
                       <CardTitle className="text-xl font-black">Endpoints Externos</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 space-y-4">
                       <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Bridge API URL</Label>
                          <Input 
                            value={advancedInputSettings.url_api_aeroclube} 
                            onChange={(e) => handleAdvancedInputChange('url_api_aeroclube', e.target.value)}
                            className="h-12 rounded-xl bg-gray-50 border-gray-100 font-bold"
                          />
                       </div>
                       <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Secure Access Token</Label>
                          <Input 
                            type="password"
                            value={advancedInputSettings.token_api_aeroclube} 
                            onChange={(e) => handleAdvancedInputChange('token_api_aeroclube', e.target.value)}
                            className="h-12 rounded-xl bg-gray-50 border-gray-100 font-bold"
                          />
                       </div>
                    </CardContent>
                 </Card>
              </div>

           </div>
        </TabsContent>

        {/* Aba de Conectividade: API Options */}
        <TabsContent value="api" className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
           <Card className="rounded-[3rem] border-none shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-primary to-primary/80 p-10 text-white">
                 <div className="flex items-center gap-5 mb-4">
                    <div className="p-4 bg-white/20 backdrop-blur-md rounded-[1.5rem] shadow-xl">
                       <Database className="w-8 h-8" />
                    </div>
                    <div>
                       <h3 className="text-3xl font-black tracking-tight">Canais de Integração</h3>
                       <p className="opacity-80 font-bold uppercase tracking-widest text-[11px] mt-1">Gerencie tokens, credenciais e gateways externos</p>
                    </div>
                 </div>
              </div>
              
              <CardContent className="p-10 space-y-10">
                 {apiLoading ? (
                   <div className="flex flex-col items-center justify-center p-20 gap-4">
                      <Loader2 className="w-12 h-12 text-primary animate-spin" />
                      <p className="font-black text-gray-400 uppercase tracking-widest text-xs">Acessando cofre de chaves...</p>
                   </div>
                 ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                       {/* SulAmerica Case Especial */}
                       {getApiConfigOptions().find((o: any) => o.url === 'credenciais_sulamerica') && (
                          <div className="md:col-span-2 bg-blue-50/50 p-8 rounded-[2.5rem] border-2 border-dashed border-blue-100 mb-4">
                              <SulAmericaSettingsCard
                                  option={getApiConfigOptions().find((o: any) => o.url === 'credenciais_sulamerica')}
                                  value={getCurrentOptionValue(getApiConfigOptions().find((o: any) => o.url === 'credenciais_sulamerica'))}
                                  onChange={(id, val) => handleApiOptionChange(id, val)}
                                  onSave={handleSaveApiSettings}
                                  isLoading={isLoading}
                              />
                          </div>
                       )}

                       {/* Outras opções de API */}
                       {getApiConfigOptions().filter((o: any) => o.url !== 'credenciais_sulamerica').map((option) => (
                         <div key={option.id} className="group flex flex-col gap-3 p-6 rounded-[2rem] bg-gray-50/30 hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all border border-transparent hover:border-gray-100">
                            <div className="flex items-center justify-between">
                               <Label className="font-black text-gray-800 text-sm">{option.name}</Label>
                               <Badge variant="outline" className="text-[9px] border-gray-200 text-gray-400 uppercase font-black tracking-tighter">API Option #{option.id}</Badge>
                            </div>
                            <Input 
                               value={getCurrentOptionValue(option)}
                               onChange={(e) => handleApiOptionChange(option.id, e.target.value)}
                               className="h-14 rounded-2xl border-gray-100 bg-white shadow-sm font-bold focus:ring-primary focus:border-primary px-5"
                               placeholder="Digite o valor..."
                            />
                            {option.obs && (
                              <div className="flex items-start gap-2 px-2">
                                 <Archive className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                                 <p className="text-[11px] font-medium text-gray-400 leading-tight">
                                   {option.obs}
                                 </p>
                              </div>
                            )}
                         </div>
                       ))}
                    </div>
                 )}

                 <div className="flex justify-end pt-10 border-t border-gray-100 gap-4">
                    <Button 
                      variant="ghost" 
                      onClick={handleSaveFunctionalityOptions} 
                      className="h-14 px-8 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-400 hover:text-primary transition-colors"
                    >
                       Sincronizar Lote
                    </Button>
                    <Button 
                      onClick={handleSaveApiSettings}
                      disabled={isLoading || Object.keys(localApiOptions).length === 0}
                      className="h-14 px-10 rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-2xl shadow-primary/20 gap-3"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      Persistir Conexões
                    </Button>
                 </div>
              </CardContent>
           </Card>
        </TabsContent>
      </Tabs>
      
      {/* Botão de Ajuda Flutuante ou Tip */}
      <div className="mt-20 text-center pb-20">
         <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-300">
           Sistema Baseado em Algoritmos de Alta Performance • v2.1.4
         </p>
      </div>

    </div>
  );
}
