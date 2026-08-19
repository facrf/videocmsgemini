import React, { useState } from 'react';
import {
  X,
  Camera as CameraIcon,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Network,
  Lock,
  Sliders,
  Tag,
  Layers,
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
            message: 'Conexão bem-sucedida com a câmera!',
            caps,
          });
        } else {
          setTestResult({
            success: false,
            message: res.error || 'Falha na conexão',
          });
        }
      } else {
        setTestResult({
          success: true,
          message: 'Parâmetros válidos para cadastro e teste.',
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
              <CameraIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">
                {isEditing ? 'Editar Configurações da Câmera IP' : 'Cadastrar Nova Câmera IP'}
              </h3>
              <p className="text-xs text-slate-400">Configuração de rede, autenticação, ONVIF e RTSP</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3.5 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 text-xs shadow-inner flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Basic Info Group */}
          <div className="space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Network className="w-3.5 h-3.5 text-blue-400" /> Identificação & Endereçamento
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome da Câmera *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Ex: Câmera Portaria Principal"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 shadow-inner"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Host / Endereço IP *</label>
                <input
                  type="text"
                  name="host"
                  value={formData.host}
                  onChange={handleChange}
                  placeholder="Ex: 192.168.1.100"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 shadow-inner"
                  required
                />
              </div>
            </div>
          </div>

          {/* Network & Ports */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Porta HTTP/ONVIF</label>
              <input
                type="number"
                name="port"
                value={formData.port}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-blue-500 shadow-inner"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Porta RTSP</label>
              <input
                type="number"
                name="rtsp_port"
                value={formData.rtsp_port}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-blue-500 shadow-inner"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Transporte</label>
              <select
                name="preferred_transport"
                value={formData.preferred_transport}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 shadow-inner"
              >
                <option value="tcp">TCP (Recomendado)</option>
                <option value="udp">UDP</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Fabricante</label>
              <input
                type="text"
                name="manufacturer"
                value={formData.manufacturer}
                onChange={handleChange}
                placeholder="Ex: Intelbras, Hikvision"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 shadow-inner"
              />
            </div>
          </div>

          {/* Credentials */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-blue-400" /> Autenticação Segura
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Usuário</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 shadow-inner"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isEditing ? 'Nova Senha (deixe em branco para manter)' : 'Senha da Câmera'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder={isEditing ? '••••••••' : 'Senha do dispositivo'}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white pr-10 focus:outline-none focus:border-blue-500 shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Advanced / Optional Paths */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-blue-400" /> Caminhos & URLs Específicas (Opcional)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">ONVIF URL</label>
                <input
                  type="text"
                  name="onvif_url"
                  value={formData.onvif_url}
                  onChange={handleChange}
                  placeholder="http://host:port/onvif/device_service"
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-blue-500 shadow-inner"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">RTSP Stream Path (Main)</label>
                <input
                  type="text"
                  name="rtsp_path"
                  value={formData.rtsp_path}
                  onChange={handleChange}
                  placeholder="/cam/realmonitor?channel=1&subtype=0"
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-blue-500 shadow-inner"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">RTSP Substream Path</label>
              <input
                type="text"
                name="substream_path"
                value={formData.substream_path}
                onChange={handleChange}
                placeholder="/cam/realmonitor?channel=1&subtype=1"
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-blue-500 shadow-inner"
              />
            </div>
          </div>

          {/* Tags & Groups */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-slate-800/80">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <Tag className="w-3 h-3 text-blue-400" /> Tags (separadas por vírgula)
              </label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                placeholder="Ex: entrada, externo, hd"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 shadow-inner"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <Layers className="w-3 h-3 text-blue-400" /> Grupos
              </label>
              <input
                type="text"
                name="groups"
                value={formData.groups}
                onChange={handleChange}
                placeholder="Ex: Perímetro, Estacionamento"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 shadow-inner"
              />
            </div>
          </div>

          {/* Test & Detection Results */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs shadow-md ${
                testResult.success
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-800 text-rose-300'
              }`}
            >
              <div className="flex items-center space-x-2 font-bold mb-1">
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                )}
                <span>{testResult.message}</span>
              </div>
              {testResult.caps && (
                <div className="mt-2 pt-2 border-t border-emerald-800/50 flex flex-wrap gap-2 text-[11px] font-mono font-semibold">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-900/60 border border-emerald-700">
                    ONVIF: {testResult.caps.onvif ? 'Sim' : 'Não'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-900/60 border border-emerald-700">
                    RTSP: {testResult.caps.rtsp ? 'Sim' : 'Não'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-900/60 border border-emerald-700">
                    PTZ: {testResult.caps.ptz ? 'Sim' : 'Não'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-900/60 border border-emerald-700">
                    Substream: {testResult.caps.sub_stream ? 'Sim' : 'Não'}
                  </span>
                </div>
              )}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800/80 bg-slate-950/70 flex items-center justify-between">
          <button
            type="button"
            onClick={handleTestAndProbe}
            disabled={testing}
            className="px-3.5 py-2 text-xs font-semibold bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700/80 flex items-center gap-1.5 transition disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin-custom text-blue-400' : ''}`} />
            <span>{testing ? 'Testando...' : 'Testar Conexão'}</span>
          </button>
          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="px-5 py-2 text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl transition shadow-lg shadow-blue-600/25 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : isEditing ? 'Atualizar Câmera' : 'Salvar Câmera'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

