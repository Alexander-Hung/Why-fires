import React, { useState, useRef, useEffect } from 'react';
import '../styles/ResizableSidebar.css';

/**
 * ResizableSidebar - A sidebar component that can be resized by dragging
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content to render inside the sidebar
 * @param {React.ReactNode} props.footer - Optional footer content (mainly for left sidebar)
 * @param {boolean} props.isOpen - Whether the sidebar is open
 * @param {function} props.onToggle - Function to call when toggling open/close
 * @param {string} props.position - 'left' or 'right'
 * @param {number} props.defaultWidth - Initial width in pixels
 * @param {number} props.minWidth - Minimum width in pixels
 * @param {number} props.maxWidth - Maximum width in pixels
 */
const ResizableSidebar = ({
                              children,
                              footer,
                              isOpen,
                              onToggle,
                              position = 'left',
                              defaultWidth = position === 'left' ? 300 : 600,
                              minWidth = position === 'left' ? 250 : 300,
                              maxWidth = position === 'left' ? 500 : 1200
                          }) => {
    const [width, setWidth] = useState(defaultWidth);
    const [isDragging, setIsDragging] = useState(false);
    const sidebarRef = useRef(null);
    const dragStartPosRef = useRef(0);
    const initialWidthRef = useRef(defaultWidth);

    // Update CSS variable for sidebar width
    useEffect(() => {
        document.documentElement.style.setProperty(
            `--sidebar-width-${position}`,
            `${width}px`
        );
    }, [width, position]);

    // Handle mousedown on resize handle
    const handleDragStart = (e) => {
        e.preventDefault();
        setIsDragging(true);
        dragStartPosRef.current = position === 'left' ? e.clientX : window.innerWidth - e.clientX;
        initialWidthRef.current = width;
    };

    // Handle resize during drag
    useEffect(() => {
        const handleDrag = (e) => {
            if (!isDragging) return;

            let newWidth;
            if (position === 'left') {
                // For left sidebar, calculate new width based on drag distance
                newWidth = initialWidthRef.current + (e.clientX - dragStartPosRef.current);
            } else {
                // For right sidebar, calculate new width based on drag distance from right edge
                newWidth = initialWidthRef.current + ((window.innerWidth - e.clientX) - dragStartPosRef.current);
            }

            // Constrain width within min and max limits
            newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
            setWidth(newWidth);
        };

        const handleDragEnd = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleDrag);
            document.addEventListener('mouseup', handleDragEnd);
            // Add class to body to prevent text selection during resize
            document.body.classList.add('resizing');
        }

        return () => {
            document.removeEventListener('mousemove', handleDrag);
            document.removeEventListener('mouseup', handleDragEnd);
            document.body.classList.remove('resizing');
        };
    }, [isDragging, position, minWidth, maxWidth]);

    // Get proper classes for sidebar based on position and state
    const getSidebarClasses = () => {
        return `resizable-sidebar ${position} ${isOpen ? 'is-open' : 'is-closed'}`;
    };

    // Get proper classes for toggle button
    const getToggleClasses = () => {
        return `sidebar-toggle ${position} ${isOpen ? 'is-open' : ''}`;
    };

    return (
        <>
            {/* Main sidebar */}
            <div
                className={getSidebarClasses()}
                ref={sidebarRef}
                style={{ width: `${width}px` }}
            >
                <div className="sidebar-content">
                    {children}
                </div>

                {/* Resize handle - position depends on which sidebar */}
                <div
                    className={`resize-handle ${position} ${isDragging ? 'active' : ''}`}
                    onMouseDown={handleDragStart}
                />

                {/* Footer for left sidebar */}
                {position === 'left' && footer && (
                    <div className={`sidebar-footer ${!isOpen ? 'is-closed' : ''}`} style={{ width: `${width}px` }}>
                        {footer}
                    </div>
                )}
            </div>

            {/* Separate toggle button positioned with CSS */}
            <button
                className={getToggleClasses()}
                onClick={onToggle}
                style={{
                    // Use inline style to dynamically set position based on current width
                    ...(position === 'left' && isOpen ? { left: `${width}px` } : {}),
                    ...(position === 'right' && isOpen ? { right: `${width}px` } : {})
                }}
            >
        <span className="material-icons icon-open">
          {position === 'left' ? 'keyboard_double_arrow_right' : 'keyboard_double_arrow_left'}
        </span>
                <span className="material-icons icon-close">
          {position === 'left' ? 'keyboard_double_arrow_left' : 'keyboard_double_arrow_right'}
        </span>
            </button>
        </>
    );
};

export default ResizableSidebar;