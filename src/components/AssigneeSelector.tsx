import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { getProjectMembers } from '@/services/projects';
import type { ProjectMember } from '@/types/project';
import UserAvatar from './UserAvatar';
import { User } from 'lucide-react';

interface AssigneeSelectorProps {
  projectId: string | null;
  selectedUserId: string;
  onSelect: (userId: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export default function AssigneeSelector({
  projectId,
  selectedUserId,
  onSelect,
  label,
  className = '',
  disabled = false
}: AssigneeSelectorProps) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (projectId) {
      setLoading(true);
      getProjectMembers(projectId)
        .then(setMembers)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setMembers([]);
    }
  }, [projectId]);

  useLayoutEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [isOpen]);

  const selectedMember = members.find(m => String(m.userId) === String(selectedUserId));

  return (
    <div className={`relative z-30 ${className}`}>
      {label && <label className="block text-xs font-medium text-olive-500  mb-1.5">{label}</label>}
      
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || loading}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
          isOpen 
            ? 'border-olive-500 ring-2 ring-olive-500/10 bg-white'
            : 'border-olive-200  bg-olive-50/50  hover:border-olive-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {selectedMember ? (
          <>
            <UserAvatar 
              name={selectedMember.user.name} 
              email={selectedMember.user.email} 
              size="sm" 
              showTooltip={false} 
            />
            <span className="text-sm font-medium text-olive-700  truncate">
              {selectedMember.user.name || selectedMember.user.email}
            </span>
          </>
        ) : (
          <>
            <div className="w-7 h-7 rounded-full bg-olive-200  flex items-center justify-center">
              <User className="w-4 h-4 text-olive-500" />
            </div>
            <span className="text-sm text-olive-500">Unassigned</span>
          </>
        )}
      </button>

      {isOpen && createPortal(
        <>
          <div 
            className="fixed inset-0 z-[6000]" 
            onClick={() => setIsOpen(false)}
          ></div>
          <div 
            className="fixed z-[6001] max-h-60 overflow-y-auto bg-white  rounded-xl border border-olive-200  shadow-xl p-1.5 animate-modalIn"
            style={{
              top: `${dropdownPos.top + 8}px`,
              left: `${dropdownPos.left}px`,
              width: `${dropdownPos.width}px`
            }}
          >
            {members.length === 0 ? (
              <div className="p-3 text-sm text-olive-500 text-center">No members found</div>
            ) : (
              members.map((member) => (
                <button
                  key={member.userId}
                  type="button"
                  onClick={() => {
                    onSelect(member.userId);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors ${
                    String(selectedUserId) === String(member.userId)
                      ? 'bg-olive-50  text-olive-700  ring-1 ring-olive-500/20' 
                      : 'hover:bg-olive-50  text-olive-700'
                  }`}
                >
                  <UserAvatar 
                    name={member.user.name} 
                    email={member.user.email} 
                    size="sm" 
                    showTooltip={false} 
                  />
                  <div className="flex flex-col items-start min-w-0">
                    <span className="text-sm font-medium truncate">
                      {member.user.name || member.user.email}
                    </span>
                    {member.user.name && (
                      <span className="text-[11px] text-olive-500  truncate">
                        {member.user.email}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}