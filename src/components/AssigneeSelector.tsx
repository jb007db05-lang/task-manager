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
        // The dropdown is position: fixed, so viewport coordinates are what we need.
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
  }, [isOpen]);

  const selectedMember = members.find(m => String(m.userId) === String(selectedUserId));

  return (
    <div className={`relative z-30 ${className}`}>
      {label && <label className="block text-[13px] font-medium text-olive-700 mb-1.5">{label}</label>}
      
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || loading}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-[2.375rem] flex items-center gap-2 px-2.5 rounded-lg border bg-white shadow-xs transition-colors ${
          isOpen
            ? 'border-brand-500 shadow-[var(--focus-ring)]'
            : 'border-olive-300 hover:border-olive-400'
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
            <span className="text-sm text-olive-900 truncate">
              {selectedMember.user.name || selectedMember.user.email}
            </span>
          </>
        ) : (
          <>
            <div className="w-6 h-6 rounded-full border border-dashed border-olive-300 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-olive-400" />
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
            className="fixed z-[6001] max-h-60 overflow-y-auto bg-white rounded-xl ring-1 ring-olive-950/[0.07] shadow-lg p-1 animate-modalIn"
            style={{
              top: `${dropdownPos.top + 6}px`,
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
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-left transition-colors ${
                    String(selectedUserId) === String(member.userId)
                      ? 'bg-brand-50 text-brand-900'
                      : 'hover:bg-olive-100 text-olive-800'
                  }`}
                >
                  <UserAvatar 
                    name={member.user.name} 
                    email={member.user.email} 
                    size="sm" 
                    showTooltip={false} 
                  />
                  <div className="flex flex-col items-start min-w-0">
                    <span className="text-[13px] font-medium truncate">
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