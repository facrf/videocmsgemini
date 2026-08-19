import React, { useState } from 'react';
import {
  X,
  Camera as CameraIcon,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Tag,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { Camera, CameraCapabilities } from '../types';
import { api } from '../api/client';

interface CameraModalProps {
  camera?: Camera | null;
  onClose: () => void;
  onSave: () => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({ camera, onClose, onSave }) => {
  const isEditing = !!camera;
  const [activeTab, setActiveTab] = useState<'basic' | 'auth' | 'streams' | 'tags'>('basic');

  const [formData, setFormData] = useState({
    name: camera?.name || '',
    host: camera?.host || '',
    port: camera?.port || 80,
    rtsp_port: camera?.rtsp_port || 554,
    manufacturer: camera?.manufacturer || '',
    model: camera?.model || '',
    username: camera?.username || 'admin',
    password: '',
    preferred_transport: camera?.preferred_transport || 'tcp',
    onvif_url: camera?.onvif_url || '',
    rtsp_path: camera?.rtsp_path || '',
    substream_path: camera?.substream_path || '',
    tags: camera?.tags?.join(', ') || '',
    groups: camera?.groups?.join(', ') || '',
    enabled: camera ? camera.enabled : true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; caps?: CameraCapabilities } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const handleTestAndProbe = async () => {
    if (!formData.host) {
      setError('Por favor, informe o Host/IP da câmera');
      return;
    }

    setTesting(true);
    setTestResult(null);
    setError(null);

    try {
      if (isEditing && camera) {
        const res = await api.testCamera(camera.id, formData.password || undefined);
        if (res.success) {
          const caps = await api.getCameraCapabilities(camera.id);
          setTestResult({
            success: true,
            message: 'Conexão testada com sucesso com a câmera!',
            caps,
          });
        } else {
          setTestResult({
            success: false,
            message: res.error || 'Falha na autenticação ou timeout',
          });
        }
      } else {
        setTestResult({
          success: true,
          message: 'Parâmetros de rede válidos para cadastro e validação.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Erro ao conectar à câmera',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.host) {
      setError('Nome e Host/IP são obrigatórios');
      return;
    }

    setSaving(true);
    setError(null);

    const payload: Partial<Camera> = {
      name: formData.name,
      host: formData.host,
      port: formData.port,
      rtsp_port: formData.rtsp_port,
      manufacturer: formData.manufacturer,
      model: formData.model,
      username: formData.username,
      preferred_transport: formData.preferred_transport,
      onvif_url: formData.onvif_url,
      rtsp_path: formData.rtsp_path,
      substream_path: formData.substream_path,
      enabled: formData.enabled,
      tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      groups: formData.groups ? formData.groups.split(',').map((g) => g.trim()).filter(Boolean) : [],
    };

    if (formData.password) {
      payload.password = formData.password;
    }

    try {
      if (isEditing && camera) {
        await api.updateCamera(camera.id, payload);
      } else {
        await api.createCamera(payload);
      }
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar câmera');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/40 rounded-xl max-w-2xl w-full overflow-hidden shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-700/40 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <CameraIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                {isEditing ? 'Configurações da Câmera IP' : 'Cadastrar Nova Câmera IP'}
              </h3>
              <p className="text-sm text-slate-400">
                {isEditing ? `Editando ${camera?.name} (${camera?.host})` : 'Configuração de rede, autenticação ONVIF e streams RTSP'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 px-5 pt-3 border-b border-slate-700/40 text-sm">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'basic'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Identificação & Rede
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('auth')}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'auth'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Autenticação Segura
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('streams')}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'streams'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            ONVIF & RTSP
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tags')}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'tags'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Tags & Grupos
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 bg-rose-600/20 border border-rose-500/30 rounded-lg text-rose-400 text-sm flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Nome da Câmera *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Ex: Câmera Portaria Principal"
                    className="w-full bg-slate-800 border border-slate-700/40 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Host / Endereço IP *</label>
                  <input
                    type="text"
                    name="host"
                    value={formData.host}
                    onChange={handleChange}
                    placeholder="Ex: 192.168.1.100"
                    className="w-full bg-slate-800 border border-slate-700/40 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Porta HTTP</label>
                  <input
                    type="number"
                    name="port"
                    value={formData.port}
                    onChange={handleChange}
                    className="w-full bg-slate-800 border border-slate-700/40 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Porta RTSP</label>
                  <input
                    type="number"
                    name="rtsp_port"
                    value={formData.rtsp_port}
                    onChange={handleChange}
                    className="w-full bg-slate-800 border border-slate-700/40 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Transporte</label>
                  <select
                    name="preferred_transport"
                    value={formData.preferred_transport}
                    onChange={handleChange}
                    className="w-full bg-slate-800 border border-slate-700/40 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none"
                  >
                    <option value="tcp">TCP (Estável)</option>
                    <option value="udp">UDP (Rápido)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Fabricante</label>
                  <input
                    type="text"
                    name="manufacturer"
                    value={formData.manufacturer}
                    onChange={handleChange}
                    placeholder="Intelbras, Dahua..."
                    className="w-full bg-slate-800 border border-slate-700/40 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'auth' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/40 space-y-1">
                <div className="flex items-center space-x-2 text-emerald-400 text-sm font-medium">
                  <ShieldCheck className="w-5 h-5" />
                  <span>Proteção de Credenciais com AES-256-GCM</span>
                </div>
                <p className="text-sm text-slate-400">
                  A senha é criptografada e nunca exposta em logs, URLs RTSP salvas ou respostas JSON da API.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Usuário ONVIF / RTSP</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="w-full bg-slate-800 border border-slate-700/40 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">
                    {isEditing ? 'Nova Senha (vazio mantém)' : 'Senha da Câmera'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder={isEditing ? '••••••••' : 'Senha do dispositivo'}
                      className="w-full bg-slate-800 border border-slate-700/40 rounded-lg px-3 py-2 text-sm text-slate-100 pr-10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'streams' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">URL do Serviço ONVIF (Opcional)</label>
                <input
                  type="text"
                  name="onvif_url"
                  value={formData.onvif_url}
                  onChange={handleChange}
                  placeholder="http://host:port/onvif/device_service"
                  className="w-full bg-slate-800 border border-slate-700/40 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none font-mono"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Caminho RTSP Main Stream</label>
                  <input
                    type="text"
                    name="rtsp_path"
                    value={formData.rtsp_path}
                    onChange={handleChange}
                    placeholder="/cam/realmonitor?channel=1&subtype=0"
                    className="w-full bg-slate-800 border border-slate-700/40 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Caminho RTSP Sub Stream</label>
                  <input
                    type="text"
                    name="substream_path"
                    value={formData.substream_path}
                    onChange={handleChange}
                    placeholder="/cam/realmonitor?channel=1&subtype=1"
                    className="w-full bg-slate-800 border border-slate-700/40 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tags' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-blue-400" /> Tags (separadas por vírgula)
                </label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  placeholder="Ex: portaria, externo, hd, 4k"
                  className="w-full bg-slate-800 border border-slate-700/40 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-cyan-400" /> Grupos de Monitoramento
                </label>
                <input
                  type="text"
                  name="groups"
                  value={formData.groups}
                  onChange={handleChange}
                  placeholder="Ex: Perímetro, Estacionamento, Bloco A"
                  className="w-full bg-slate-800 border border-slate-700/40 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none"
                />
              </div>
            </div>
          )}

          {/* Test & Detection Results */}
          {testResult && (
            <div
              className={`p-3 rounded-lg border text-sm ${
                testResult.success
                  ? 'bg-emerald-600/20 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-600/20 border-rose-500/30 text-rose-400'
              }`}
            >
              <div className="flex items-center space-x-2 font-medium mb-1">
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                )}
                <span>{testResult.message}</span>
              </div>
              {testResult.caps && (
                <div className="mt-2 pt-2 border-t border-emerald-500/30 flex flex-wrap gap-2 text-[11px] font-mono">
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-emerald-300 border border-emerald-500/40">
                    ONVIF: {testResult.caps.onvif ? 'Sim' : 'Não'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-emerald-300 border border-emerald-500/40">
                    RTSP: {testResult.caps.rtsp ? 'Sim' : 'Não'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-emerald-300 border border-emerald-500/40">
                    PTZ: {testResult.caps.ptz ? 'Sim' : 'Não'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-emerald-300 border border-emerald-500/40">
                    Substream: {testResult.caps.sub_stream ? 'Sim' : 'Não'}
                  </span>
                </div>
              )}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-700/40 flex items-center justify-between">
          <button
            type="button"
            onClick={handleTestAndProbe}
            disabled={testing}
            className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700/40 flex items-center gap-2 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin-custom text-blue-400' : ''}`} />
            <span>{testing ? 'Testando...' : 'Testar Conectividade'}</span>
          </button>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 border border-slate-700/40 text-slate-300 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition disabled:opacity-50"
            >
              {saving ? 'Salvando...' : isEditing ? 'Atualizar Câmera' : 'Salvar Câmera'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
