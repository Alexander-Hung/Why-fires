import React, { useState, useRef, useEffect } from 'react';
import '../styles/DetailContainer.css';

export const DetailContainer = ({ content, onClose }) => {
    const [position, setPosition] = useState({ x: 15, y: 15 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const detailRef = useRef(null);

    // Handle mouse down event to start dragging
    const handleMouseDown = (e) => {
        // Only start dragging when clicking on the header part
        if (e.target.closest('.detail-header')) {
            setIsDragging(true);

            // Calculate the offset of the mouse position within the detail container
            const boundingRect = detailRef.current.getBoundingClientRect();
            setDragOffset({
                x: e.clientX - boundingRect.left,
                y: e.clientY - boundingRect.top
            });

            e.preventDefault();
        }
    };

    // Handle mouse move event for dragging
    const handleMouseMove = (e) => {
        if (isDragging) {
            // Calculate new position based on mouse position and drag offset
            setPosition({
                x: e.clientX - dragOffset.x,
                y: e.clientY - dragOffset.y
            });
        }
    };

    // Handle mouse up event to stop dragging
    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Add and remove event listeners for dragging
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        } else {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    return (
        <div
            id="detailContainer"
            ref={detailRef}
            style={{
                display: 'initial',
                position: 'absolute',
                top: `${position.y}px`,
                left: `${position.x}px`,
                cursor: isDragging ? 'grabbing' : 'auto',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
                backgroundColor: 'var(--bgColor)',
                borderRadius: '5px',
                width: '250px',
                padding: '15px',
                zIndex: 1000
            }}
            onMouseDown={handleMouseDown}
        >
            <div className="detail-header" style={{
                cursor: 'grab',
                marginBottom: '10px',
                padding: '5px 0',
                borderBottom: '1px solid rgba(255,255,255,0.2)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'relative',
                textAlign: 'center'
            }}>
                {/* Centered drag handle */}
                <div style={{
                    position: 'absolute',
                    width: '100%',
                    textAlign: 'center',
                    fontSize: '16px',
                    color: 'rgba(255,255,255,0.6)',
                    pointerEvents: 'none',
                    userSelect: 'none'
                }}>
                    <div
                        className="material-icons"
                        onClick={onClose}
                        style={{
                            color: isDragging ? 'orange' : 'white',
                            display: 'initial',
                            cursor: 'pointer',
                            fontSize: '30px'
                        }}
                    >
                        drag_handle
                    </div>
                </div>

                <div
                    id="closeButton"
                    className="material-icons"
                    onClick={onClose}
                    style={{
                        display: 'initial',
                        cursor: 'pointer',
                        fontSize: '20px'
                    }}
                >
                    close
                </div>
            </div>
            <div id="detailBox" style={{ display: 'block' }}>
                <div id="detailBoxText" dangerouslySetInnerHTML={{ __html: content }}></div>
            </div>
        </div>
    );
};