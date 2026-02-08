import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Image, Video, FileText, Trash2, Plus, Smile, ThumbsUp, Eye, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";

const REACTIONS = ['👍', '👀', '❗'];

export default function EventMemories({ 
  eventId, 
  isEditable,
  userEmail,
  visibility 
}) {
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const queryClient = useQueryClient();

  // Fetch memories
  const { data: memories = [] } = useQuery({
    queryKey: ['event-memories', eventId],
    queryFn: () => base44.entities.EventMemory.filter({ event_id: eventId }, '-created_date'),
    enabled: !!eventId,
  });

  // Add memory mutation
  const addMemoryMutation = useMutation({
    mutationFn: (data) => base44.entities.EventMemory.create({
      ...data,
      event_id: eventId,
      added_by_email: userEmail,
      reactions: {}
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-memories', eventId] });
      setIsAddingNote(false);
      setNoteText('');
      toast.success('Memory added');
    },
  });

  // Delete memory mutation
  const deleteMemoryMutation = useMutation({
    mutationFn: (id) => base44.entities.EventMemory.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-memories', eventId] });
      toast.success('Memory removed');
    },
  });

  // Add reaction mutation
  const addReactionMutation = useMutation({
    mutationFn: ({ memoryId, emoji, reactions }) => {
      const updated = { ...reactions };
      if (!updated[emoji]) updated[emoji] = [];
      
      if (!updated[emoji].includes(userEmail)) {
        updated[emoji].push(userEmail);
      } else {
        updated[emoji] = updated[emoji].filter(e => e !== userEmail);
      }
      
      return base44.entities.EventMemory.update(memoryId, { reactions: updated });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-memories', eventId] });
    },
  });

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    addMemoryMutation.mutate({ type: 'note', text: noteText });
  };

  const handleFileUpload = async (file, type) => {
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      addMemoryMutation.mutate({ type, file_url });
    } catch (err) {
      toast.error('Failed to upload file');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Memories</h3>
        {isEditable && visibility === 'full' && (
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Eye className="w-3 h-3" />
            Visible to editors
          </span>
        )}
        {visibility === 'busy_only' && (
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Hidden in busy mode
          </span>
        )}
      </div>

      {/* Add note section */}
      {isEditable && (
        <div className="space-y-2">
          <AnimatePresence>
            {isAddingNote && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <Textarea
                  placeholder="Add a memory or note..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="min-h-[60px] resize-none text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleAddNote}
                    disabled={addMemoryMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-700 text-xs"
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsAddingNote(false);
                      setNoteText('');
                    }}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!isAddingNote && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsAddingNote(true)}
                className="text-xs flex-1 h-8"
              >
                <FileText className="w-3 h-3 mr-1" />
                Add Note
              </Button>
              <label className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleFileUpload(e.target.files[0], 'photo');
                    }
                  }}
                  className="hidden"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs h-8"
                  asChild
                >
                  <span>
                    <Image className="w-3 h-3 mr-1" />
                    Photo
                  </span>
                </Button>
              </label>
              <label className="flex-1">
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleFileUpload(e.target.files[0], 'video');
                    }
                  }}
                  className="hidden"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs h-8"
                  asChild
                >
                  <span>
                    <Video className="w-3 h-3 mr-1" />
                    Video
                  </span>
                </Button>
              </label>
            </div>
          )}
        </div>
      )}

      {/* Memories list */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {memories.length === 0 ? (
            <div className="text-center py-6 text-slate-400">
              <FileText className="w-5 h-5 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No memories yet</p>
            </div>
          ) : (
            memories.map((memory) => (
              <motion.div
                key={memory.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-slate-50 rounded-lg p-3 space-y-2"
              >
                {memory.type === 'note' && (
                  <div className="space-y-1">
                    <p className="text-sm text-slate-700">{memory.text}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{memory.added_by_email?.split('@')[0]}</span>
                      <span>•</span>
                      <span>{format(parseISO(memory.created_date), 'MMM d, h:mm a')}</span>
                    </div>
                  </div>
                )}

                {memory.type === 'photo' && (
                  <div className="space-y-1">
                    <img
                      src={memory.file_url}
                      alt="Memory"
                      className="w-full rounded-lg max-h-[200px] object-cover"
                    />
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{memory.added_by_email?.split('@')[0]}</span>
                      <span>•</span>
                      <span>{format(parseISO(memory.created_date), 'MMM d, h:mm a')}</span>
                    </div>
                  </div>
                )}

                {memory.type === 'video' && (
                  <div className="space-y-1">
                    <video
                      src={memory.file_url}
                      controls
                      className="w-full rounded-lg max-h-[200px] object-cover"
                    />
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{memory.added_by_email?.split('@')[0]}</span>
                      <span>•</span>
                      <span>{format(parseISO(memory.created_date), 'MMM d, h:mm a')}</span>
                    </div>
                  </div>
                )}

                {/* Reactions */}
                <div className="flex flex-wrap gap-1 pt-2">
                  {REACTIONS.map((emoji) => {
                    const count = memory.reactions?.[emoji]?.length || 0;
                    const hasReacted = memory.reactions?.[emoji]?.includes(userEmail);

                    return (
                      <button
                        key={emoji}
                        onClick={() => addReactionMutation.mutate({
                          memoryId: memory.id,
                          emoji,
                          reactions: memory.reactions || {}
                        })}
                        className={cn(
                          'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
                          hasReacted
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        )}
                      >
                        <span>{emoji}</span>
                        {count > 0 && <span className="text-xs font-medium">{count}</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Delete button */}
                {isEditable && (
                  <button
                    onClick={() => deleteMemoryMutation.mutate(memory.id)}
                    className="text-xs text-slate-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-3 h-3 inline mr-1" />
                    Remove
                  </button>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}