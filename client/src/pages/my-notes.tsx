import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { UserNote, Video } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { Navigation } from "@/components/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Pencil, Trash2 } from "lucide-react";
import { useLocation } from "wouter";

export default function MyNotesPage() {
  const [videosMap, setVideosMap] = useState<Record<number, Video>>({});
  const { data: user } = useQuery({
    queryKey: ["/api/me"],
    queryFn: getCurrentUser,
  });
  const queryClient = useQueryClient();
  const [editId, setEditId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [location] = useLocation();

  // 내노트 메뉴 클릭 시마다 노트 목록 자동 새로고침
  useEffect(() => {
    if (location === "/my-notes") {
      queryClient.invalidateQueries({ queryKey: ["/api/my-notes"] });
    }
  }, [location, queryClient]);

  // 모든 노트 불러오기
  const { data: notes = [], isLoading } = useQuery<UserNote[]>({
    queryKey: ["/api/my-notes"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/my-notes");
      return res.json();
    },
  });

  // 노트에 해당하는 비디오 정보도 불러오기
  useEffect(() => {
    async function fetchVideos() {
      if (notes.length === 0) return;
      const videoIds = Array.from(new Set(notes.map(n => n.videoId)));
      const videosRes = await apiRequest("POST", "/api/videos/bulk", { ids: videoIds });
      const videos: Video[] = await videosRes.json();
      const map: Record<number, Video> = {};
      videos.forEach(v => { map[v.id] = v; });
      setVideosMap(map);
    }
    fetchVideos();
  }, [notes]);

  // 노트 삭제
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/notes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-notes"] });
    },
  });

  // 노트 수정
  const updateMutation = useMutation({
    mutationFn: async ({ id, content }: { id: number; content: string }) => {
      await apiRequest("PUT", `/api/notes/${id}`, { content });
    },
    onSuccess: () => {
      setEditId(null);
      setEditContent("");
      queryClient.invalidateQueries({ queryKey: ["/api/my-notes"] });
    },
  });

  const handleEdit = (note: UserNote) => {
    setEditId(note.id);
    setEditContent(note.content);
  };

  const handleDelete = (note: UserNote) => {
    if (window.confirm("정말로 이 노트를 삭제하시겠습니까?")) {
      deleteMutation.mutate(note.id);
    }
  };

  const handleEditSave = (note: UserNote) => {
    if (editContent.trim()) {
      updateMutation.mutate({ id: note.id, content: editContent });
    }
  };

  const handleEditCancel = () => {
    setEditId(null);
    setEditContent("");
  };

  return (
    <div>
      {/* 상단 네비게이션 */}
      {user && <Navigation user={user} />}
      <div className="max-w-3xl mx-auto py-10">
        <h1 className="text-2xl font-bold text-white mb-6">내 노트</h1>
        {isLoading ? (
          <div className="text-slate-400">노트를 불러오는 중...</div>
        ) : notes.length === 0 ? (
          <div className="text-slate-400">작성한 노트가 없습니다.</div>
        ) : (
          <div className="space-y-6">
            {notes.map(note => (
              <Card key={note.id} className="bg-slate-800 p-6 flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="mb-2 text-lg font-semibold text-aviation-blue">
                    {videosMap[note.videoId]?.title || `강의 #${note.videoId}`}
                  </div>
                  {editId === note.id ? (
                    <>
                      <textarea
                        className="w-full bg-slate-700 text-white p-2 rounded mb-2"
                        rows={3}
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                      />
                      <div className="space-x-2">
                        <button
                          className="px-3 py-1 bg-aviation-blue text-white rounded hover:bg-blue-700"
                          onClick={() => handleEditSave(note)}
                          disabled={updateMutation.isPending}
                        >
                          저장
                        </button>
                        <button
                          className="px-3 py-1 bg-slate-600 text-white rounded hover:bg-slate-500"
                          onClick={handleEditCancel}
                          disabled={updateMutation.isPending}
                        >
                          취소
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-slate-200 mb-2 whitespace-pre-line">{note.content}</div>
                      <div className="text-xs text-slate-400">
                        {new Date(note.createdAt).toLocaleString()}
                      </div>
                    </>
                  )}
                </div>
                <div className="flex flex-col items-end space-y-2 ml-4">
                  <button
                    className="p-2 rounded hover:bg-slate-700"
                    onClick={() => handleEdit(note)}
                    aria-label="노트 편집"
                  >
                    <Pencil className="w-5 h-5 text-slate-400 hover:text-blue-400" />
                  </button>
                  <button
                    className="p-2 rounded hover:bg-slate-700"
                    onClick={() => handleDelete(note)}
                    aria-label="노트 삭제"
                  >
                    <Trash2 className="w-5 h-5 text-red-400 hover:text-red-600" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 