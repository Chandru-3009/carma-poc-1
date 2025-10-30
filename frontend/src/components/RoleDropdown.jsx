import { useEffect, useRef, useState } from 'react';

export default function RoleDropdown({ roles, value, onChange, placeholder = '-- Select a role --' }) {
	const [open, setOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(-1);
	const ref = useRef(null);
	const buttonRef = useRef(null);

	useEffect(() => {
		function onDocClick(e) {
			if (ref.current && !ref.current.contains(e.target)) {
				setOpen(false);
				setActiveIndex(-1);
			}
		}
		document.addEventListener('mousedown', onDocClick);
		return () => document.removeEventListener('mousedown', onDocClick);
	}, []);

	const currentLabel = value || '';

	const selectItem = (item) => {
		onChange?.(item);
		setOpen(false);
		setActiveIndex(-1);
		buttonRef.current?.focus();
	};

	const handleKeyDown = (e) => {
		if (!open && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
			e.preventDefault();
			setOpen(true);
			setActiveIndex(Math.max(0, roles.indexOf(value)));
			return;
		}
		if (open) {
			if (e.key === 'Escape') {
				setOpen(false);
				return;
			}
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				setActiveIndex((i) => (i + 1) % roles.length);
			}
			if (e.key === 'ArrowUp') {
				e.preventDefault();
				setActiveIndex((i) => (i - 1 + roles.length) % roles.length);
			}
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				if (activeIndex >= 0) selectItem(roles[activeIndex]);
			}
		}
	};

	return (
		<div className="relative" ref={ref}>
			<button
				type="button"
				ref={buttonRef}
				className="w-full border border-gray-300 bg-white text-gray-700 rounded-lg px-4 py-2.5 pr-10 text-left focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 hover:border-blue-400 transition"
				onClick={() => setOpen((o) => !o)}
				onKeyDown={handleKeyDown}
				aria-haspopup="listbox"
				aria-expanded={open}
			>
				<span>{currentLabel || placeholder}</span>
				<span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
					<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
						<path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
					</svg>
				</span>
			</button>
			{open && (
				<ul
					role="listbox"
					className="absolute z-10 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
				>
					{roles.map((item, idx) => {
						const selected = item === value;
						const active = idx === activeIndex;
						return (
							<li
								key={item}
								role="option"
								aria-selected={selected}
								onMouseEnter={() => setActiveIndex(idx)}
								onMouseLeave={() => setActiveIndex(-1)}
								onClick={() => selectItem(item)}
								className={`px-4 py-2 text-sm cursor-pointer ${selected ? 'bg-blue-50 text-blue-700 font-semibold' : active ? 'bg-gray-100 text-gray-900' : 'text-gray-800'}`}
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
