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
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 select-none">
      <div className="bg-[#0b101d] border border-slate-700/80 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-[#070b14]">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
              <CameraIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white font-mono">
                {isEditing ? 'Configurações da Câmera IP' : 'Cadastrar Nova Câmera IP'}
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                {isEditing ? `Editando ${camera?.name} (${camera?.host})` : 'Configuração de rede, autenticação ONVIF e streams RTSP'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 px-6 pt-3 bg-[#080d18] border-b border-slate-800 text-xs font-mono font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`px-4 py-2.5 rounded-t-xl transition-all border-t border-x ${
              activeTab === 'basic'
                ? 'bg-[#0b101d] text-cyan-400 border-slate-700/80 shadow-md'
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            Identificação & Rede
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('auth')}
            className={`px-4 py-2.5 rounded-t-xl transition-all border-t border-x ${
              activeTab === 'auth'
                ? 'bg-[#0b101d] text-cyan-400 border-slate-700/80 shadow-md'
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            Autenticação Segura
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('streams')}
            className={`px-4 py-2.5 rounded-t-xl transition-all border-t border-x ${
              activeTab === 'streams'
                ? 'bg-[#0b101d] text-cyan-400 border-slate-700/80 shadow-md'
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            ONVIF & RTSP
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tags')}
            className={`px-4 py-2.5 rounded-t-xl transition-all border-t border-x ${
              activeTab === 'tags'
                ? 'bg-[#0b101d] text-cyan-400 border-slate-700/80 shadow-md'
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            Tags & Grupos
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-4 bg-rose-950/80 border border-rose-800 rounded-2xl text-rose-300 text-xs shadow-inner flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 font-mono">Nome da Câmera *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Ex: Câmera Portaria Principal"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 shadow-inner font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 font-mono">Host / Endereço IP *</label>
                  <input
                    type="text"
                    name="host"
                    value={formData.host}
                    onChange={handleChange}
                    placeholder="Ex: 192.168.1.100"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 shadow-inner font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">Porta HTTP</label>
                  <input
                    type="number"
                    name="port"
                    value={formData.port}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-blue-500 shadow-inner font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">Porta RTSP</label>
                  <input
                    type="number"
                    name="rtsp_port"
                    value={formData.rtsp_port}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-blue-500 shadow-inner font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">Transporte</label>
                  <select
                    name="preferred_transport"
                    value={formData.preferred_transport}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 shadow-inner font-bold"
                  >
                    <option value="tcp">TCP (Estável)</option>
                    <option value="udp">UDP (Rápido)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">Fabricante</label>
                  <input
                    type="text"
                    name="manufacturer"
                    value={formData.manufacturer}
                    onChange={handleChange}
                    placeholder="Intelbras, Dahua..."
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 shadow-inner"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'auth' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1.5 shadow-inner">
                <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Proteção de Credenciais com AES-256-GCM</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                  A senha é criptografada e nunca exposta em logs, URLs RTSP salvas ou respostas JSON da API.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 font-mono">Usuário ONVIF / RTSP</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:border-blue-500 shadow-inner font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 font-mono">
                    {isEditing ? 'Nova Senha (deixe em branco para manter)' : 'Senha da Câmera'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder={isEditing ? '••••••••' : 'Senha do dispositivo'}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white pr-10 focus:outline-none focus:border-cyan-500 shadow-inner font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'streams' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">URL do Serviço ONVIF (Opcional)</label>
                <input
                  type="text"
                  name="onvif_url"
                  value={formData.onvif_url}
                  onChange={handleChange}
                  placeholder="http://host:port/onvif/device_service"
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-mono text-white focus:outline-none focus:border-blue-500 shadow-inner"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">Caminho RTSP Main Stream</label>
                  <input
                    type="text"
                    name="rtsp_path"
                    value={formData.rtsp_path}
                    onChange={handleChange}
                    placeholder="/cam/realmonitor?channel=1&subtype=0"
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-mono text-white focus:outline-none focus:border-blue-500 shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">Caminho RTSP Sub Stream</label>
                  <input
                    type="text"
                    name="substream_path"
                    value={formData.substream_path}
                    onChange={handleChange}
                    placeholder="/cam/realmonitor?channel=1&subtype=1"
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-mono text-white focus:outline-none focus:border-blue-500 shadow-inner"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tags' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 font-mono flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-blue-400" /> Tags (separadas por vírgula)
                </label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  placeholder="Ex: portaria, externo, hd, 4k"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:border-blue-500 shadow-inner font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 font-mono flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" /> Grupos de Monitoramento
                </label>
                <input
                  type="text"
                  name="groups"
                  value={formData.groups}
                  onChange={handleChange}
                  placeholder="Ex: Perímetro, Estacionamento, Bloco A"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:border-cyan-500 shadow-inner font-mono"
                />
              </div>
            </div>
          )}

          {/* Test & Detection Results */}
          {testResult && (
            <div
              className={`p-4 rounded-2xl border text-xs shadow-xl ${
                testResult.success
                  ? 'bg-emerald-950/50 border-emerald-700/80 text-emerald-300'
                  : 'bg-rose-950/50 border-rose-700/80 text-rose-300'
              }`}
            >
              <div className="flex items-center space-x-2 font-bold mb-1 font-mono">
                {testResult.success ? (
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4.5 h-4.5 text-rose-400" />
                )}
                <span>{testResult.message}</span>
              </div>
              {testResult.caps && (
                <div className="mt-2.5 pt-2.5 border-t border-emerald-800/60 flex flex-wrap gap-2 text-[11px] font-mono font-bold">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-900/60 border border-emerald-700">
                    ONVIF: {testResult.caps.onvif ? 'Sim' : 'Não'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-900/60 border border-emerald-700">
                    RTSP: {testResult.caps.rtsp ? 'Sim' : 'Não'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-900/60 border border-emerald-700">
                    PTZ: {testResult.caps.ptz ? 'Sim' : 'Não'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-900/60 border border-emerald-700">
                    Substream: {testResult.caps.sub_stream ? 'Sim' : 'Não'}
                  </span>
                </div>
              )}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#070b14] flex items-center justify-between">
          <button
            type="button"
            onClick={handleTestAndProbe}
            disabled={testing}
            className="px-4 py-2.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-2xl border border-slate-700/80 flex items-center gap-2 transition disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin-custom text-cyan-400' : ''}`} />
            <span>{testing ? 'Testando...' : 'Testar Conectividade'}</span>
          </button>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-2xl transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="px-6 py-2.5 text-xs font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-2xl transition shadow-lg shadow-blue-600/30 disabled:opacity-50 hover:scale-105"
            >
              {saving ? 'Salvando...' : isEditing ? 'Atualizar Câmera' : 'Salvar Câmera'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
