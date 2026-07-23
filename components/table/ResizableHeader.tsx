'use client';

import React, { useState, useRef, useCallback } from 'react';

interface ResizableHeaderProps {
  children: React.ReactNode;
  width: number;
  onResize: (newWidth: number) => void;
  minWidth?: number;
  className?: string;
}

const ResizableHeader: React.FC<ResizableHeaderProps> = ({
  children,
  width,
  onResize,
  minWidth = 10,
  className = "",
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseMove = useCallback((e: MouseEvent) => {
    const diff = e.pageX - startX.current;
    const newWidth = Math.max(minWidth, startWidth.current + diff);
    onResize(newWidth);
  }, [minWidth, onResize]);

  const onMouseUp = useCallback(() => {
    setIsResizing(false);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [onMouseMove]);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    startX.current = e.pageX;
    startWidth.current = width;

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <th
      style={{ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }}
      className={`relative group ${className}`}
    >
      <div className="w-full h-full flex items-center overflow-hidden whitespace-nowrap">
        <div className="flex-1 min-w-0 overflow-hidden">
          {children}
        </div>
      </div>
      <div
        onMouseDown={onMouseDown}
        onClick={(e) => e.stopPropagation()}
        className={`absolute right-0 top-0 h-full w-4 cursor-col-resize z-20 flex justify-center hover:bg-gray-300 opacity-0 group-hover:opacity-100 transition-opacity ${isResizing ? 'opacity-100 bg-blue-400' : ''}`}
        style={{ transform: 'translateX(50%)' }}
      >
        <div className="w-[1px] h-full bg-gray-300 mx-auto" />
      </div>
    </th>
  );
};

export default ResizableHeader;
