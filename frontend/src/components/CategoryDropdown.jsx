import { useEffect, useRef, useState } from 'react';

const categories = [
	'All',
	'RFI',
	'Material Delay',
	'Schedule Update',
	'General',
	'Submittal',
	'Coordination',
];

function ChevronDown(props) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			{...props}
		>
			<polyline points="6 9 12 15 18 9"></polyline>
		</svg>
	);
}

export default function CategoryDropdown({ value, onChange }) {
	const [open, setOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(-1);
	const containerRef = useRef(null);
	const buttonRef = useRef(null);
	const listRef = useRef(null);

	useEffect(() => {
		function onDocClick(e) {
			if (!containerRef.current) return;
			if (!containerRef.current.contains(e.target)) {
				setOpen(false);
				setActiveIndex(-1);
			}
		}
		document.addEventListener('mousedown', onDocClick);
		return () => document.removeEventListener('mousedown', onDocClick);
	}, []);

	useEffect(() => {
		if (open && listRef.current) {
			listRef.current.focus();
		}
	}, [open]);

	const selectItem = (item) => {
		onChange?.(item);
		setOpen(false);
		setActiveIndex(-1);
		buttonRef.current?.focus();
	};

	const handleButtonKeyDown = (e) => {
		if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			setOpen(true);
			setActiveIndex(Math.max(0, categories.indexOf(value)));
		}
	};

	const handleListKeyDown = (e) => {
		if (e.key === 'Escape') {
			e.preventDefault();
			setOpen(false);
			buttonRef.current?.focus();
			return;
		}
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			setActiveIndex((i) => (i + 1) % categories.length);
			return;
		}
		if (e.key === 'ArrowUp') {
			e.preventDefault();
			setActiveIndex((i) => (i - 1 + categories.length) % categories.length);
			return;
		}
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			if (activeIndex >= 0) selectItem(categories[activeIndex]);
		}
	};

	return (
		<div className="relative" ref={containerRef}>
			<button
				type="button"
				aria-haspopup="listbox"
				aria-expanded={open}
				onClick={() => setOpen((o) => !o)}
				onKeyDown={handleButtonKeyDown}
				ref={buttonRef}
				className="inline-flex items-center justify-between bg-white border border-gray-300 rounded-lg shadow-sm px-4 py-2 w-52 text-sm text-gray-700 hover:bg-gray-100 transition-all duration-200 ease-in-out"
			>
				<span className="truncate">{value || 'All'}</span>
				<ChevronDown className="ml-2 h-4 w-4 text-gray-500" />
			</button>

			{open && (
				<ul
					role="listbox"
					aria-activedescendant={activeIndex >= 0 ? `cat-${activeIndex}` : undefined}
					tabIndex={0}
					onKeyDown={handleListKeyDown}
					ref={listRef}
					className="absolute mt-2 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden origin-top transition transform ease-out duration-150"
					style={{ opacity: 1, transform: 'scale(1)' }}
				>
					{categories.map((item, idx) => {
						const selected = item === value || (item === 'All' && (value === 'All' || !value));
						const active = idx === activeIndex;
						return (
							<li
								id={`cat-${idx}`}
								key={item}
								role="option"
								aria-selected={selected}
								onMouseEnter={() => setActiveIndex(idx)}
								onMouseLeave={() => setActiveIndex(-1)}
								onClick={() => selectItem(item)}
								className={`px-4 py-2 text-sm cursor-pointer transition-all duration-150 ${
									selected ? 'bg-blue-100 text-blue-700 font-semibold' : active ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
								}`}
							>
								{item}
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}
