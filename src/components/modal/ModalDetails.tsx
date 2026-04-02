import React from 'react';
import {
  ExternalLink, Image as ImageIcon, Video, Calendar, User, Tag,
  LayoutGrid, Play, FileText
} from 'lucide-react';
import { AugmentedQAItem } from '../../types';
import { QA_FLOWS, PRIORITY_COLORS } from '../../constants';
import { getDirectImageUrl, getVideoEmbedUrl, isDirectVideo } from '../../utils/qaUtils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ModalDetailsProps {
  item: AugmentedQAItem;
  onQuickStatusUpdate: (status: string) => void;
  onLightboxOpen: (url: string) => void;
  onVideoLightboxOpen: (url: string, isDirect: boolean) => void;
}

export const ModalDetails: React.FC<ModalDetailsProps> = ({
  item, onQuickStatusUpdate, onLightboxOpen, onVideoLightboxOpen
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">{item.displayTitle}</h2>
          <div className="prose prose-blue max-w-none text-gray-600 bg-gray-50 p-6 rounded-2xl border border-gray-100">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {item.cleanDesc}
            </ReactMarkdown>
          </div>
        </div>

        {(item.imageLink || item.videoLink || (item.imageLinks && item.imageLinks.length > 0) || (item.videoLinks && item.videoLinks.length > 0)) && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <ImageIcon size={16} /> 媒體附件
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {item.imageLink && (
                <div
                  className="relative group cursor-zoom-in rounded-xl overflow-hidden border border-gray-200 aspect-video bg-gray-100"
                  onClick={() => onLightboxOpen(getDirectImageUrl(item.imageLink!))}
                >
                  <img
                    src={getDirectImageUrl(item.imageLink)}
                    alt="QA Screenshot"
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="bg-white/90 text-gray-900 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg">點擊放大</span>
                  </div>
                </div>
              )}
              {item.imageLinks?.map((link, idx) => (
                <div
                  key={`img-${idx}`}
                  className="relative group cursor-zoom-in rounded-xl overflow-hidden border border-gray-200 aspect-video bg-gray-100"
                  onClick={() => onLightboxOpen(getDirectImageUrl(link))}
                >
                  <img
                    src={getDirectImageUrl(link)}
                    alt={`QA Screenshot ${idx + 1}`}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="bg-white/90 text-gray-900 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg">點擊放大</span>
                  </div>
                </div>
              ))}

              {item.videoLink && (
                (isDirectVideo(item.videoLink) || getVideoEmbedUrl(item.videoLink)) ? (
                  <div
                    className="relative rounded-xl overflow-hidden border border-gray-200 aspect-video bg-black group cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onVideoLightboxOpen(item.videoLink!, isDirectVideo(item.videoLink!));
                    }}
                  >
                    {isDirectVideo(item.videoLink) ? (
                      <video src={item.videoLink} className="w-full h-full object-cover pointer-events-none opacity-70 group-hover:opacity-50 transition-opacity" />
                    ) : (
                      <iframe
                        src={getVideoEmbedUrl(item.videoLink)!}
                        className="w-full h-full pointer-events-none opacity-70 group-hover:opacity-50 transition-opacity"
                        allowFullScreen
                        tabIndex={-1}
                      />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-black/60 text-white p-4 rounded-full backdrop-blur-sm group-hover:scale-110 group-hover:bg-blue-600/90 transition-all shadow-xl border border-white/10">
                        <Play size={32} className="ml-1" fill="currentColor" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <a
                    href={item.videoLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center p-6 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors gap-3 group h-full min-h-[160px]"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="bg-white p-3 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                      <ExternalLink size={24} className="text-blue-500" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">開啟外部影片連結</span>
                  </a>
                )
              )}
              {item.videoLinks?.map((link, idx) => (
                (isDirectVideo(link) || getVideoEmbedUrl(link)) ? (
                  <div
                    key={`vid-${idx}`}
                    className="relative rounded-xl overflow-hidden border border-gray-200 aspect-video bg-black group cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onVideoLightboxOpen(link, isDirectVideo(link));
                    }}
                  >
                    {isDirectVideo(link) ? (
                      <video src={link} className="w-full h-full object-cover pointer-events-none opacity-70 group-hover:opacity-50 transition-opacity" />
                    ) : (
                      <iframe
                        src={getVideoEmbedUrl(link)!}
                        className="w-full h-full pointer-events-none opacity-70 group-hover:opacity-50 transition-opacity"
                        allowFullScreen
                        tabIndex={-1}
                      />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-black/60 text-white p-4 rounded-full backdrop-blur-sm group-hover:scale-110 group-hover:bg-blue-600/90 transition-all shadow-xl border border-white/10">
                        <Play size={32} className="ml-1" fill="currentColor" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <a
                    key={`vid-link-${idx}`}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center p-6 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors gap-3 group h-full min-h-[160px]"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="bg-white p-3 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                      <ExternalLink size={24} className="text-blue-500" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">開啟外部影片連結</span>
                  </a>
                )
              ))}
            </div>
          </div>
        )}

        {(item.attachmentUrl || (item.attachments && item.attachments.length > 0)) && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <ExternalLink size={16} /> 檔案附件
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {item.attachmentUrl && (
                <a
                  href={item.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center p-4 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors gap-3 group"
                >
                  <div className="bg-white p-2 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                    <FileText size={20} className="text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-gray-700 group-hover:text-blue-600">{item.attachmentName || '下載附件'}</div>
                    <div className="text-xs text-gray-400">點擊下載或預覽</div>
                  </div>
                </a>
              )}
              {item.attachments?.map((file, index) => (
                <a
                  key={index}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center p-4 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors gap-3 group"
                >
                  <div className="bg-white p-2 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                    <FileText size={20} className="text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-gray-700 group-hover:text-blue-600">{file.name || '下載附件'}</div>
                    <div className="text-xs text-gray-400">點擊下載或預覽</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-4">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">屬性資訊</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 flex items-center gap-2"><Tag size={14} /> 優先級</span>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${PRIORITY_COLORS[item.priority]}`}>{item.priority}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 flex items-center gap-2"><LayoutGrid size={14} /> 模組</span>
              <span className="text-xs font-bold text-gray-700">{item.module}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 flex items-center gap-2"><User size={14} /> 負責人</span>
              <span className="text-xs font-bold text-gray-700">{item.assignee}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 flex items-center gap-2"><User size={14} /> 測試人員</span>
              <span className="text-xs font-bold text-gray-700">{item.tester}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 flex items-center gap-2"><Calendar size={14} /> 測試日期</span>
              <span className="text-xs font-bold text-gray-700">{item.date}</span>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 space-y-4">
          <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider">快速操作</h3>
          <div className="grid grid-cols-2 gap-2">
            {QA_FLOWS.filter(s => s !== item.currentFlow).map(status => (
              <button
                key={status}
                onClick={() => onQuickStatusUpdate(status)}
                className="text-[10px] font-bold py-2 px-3 bg-white border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
