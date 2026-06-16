import React from 'react';
import { ChevronDown } from 'lucide-react';
import { usePlantStore } from '../store/plantStore';

const regions = [
  { value: 'all', label: '全国' },
  { value: '华北', label: '华北地区' },
  { value: '东北', label: '东北地区' },
  { value: '华东', label: '华东地区' },
  { value: '华中', label: '华中地区' },
  { value: '华南', label: '华南地区' },
  { value: '西南', label: '西南地区' },
  { value: '西北', label: '西北地区' },
];

interface ProvinceSelectorProps {
  showProvinces?: boolean;
}

const ProvinceSelector: React.FC<ProvinceSelectorProps> = ({ showProvinces = true }) => {
  const { plants, selectedProvince, setSelectedProvince } = usePlantStore();
  
  const provinces = Array.from(new Set(plants.map(p => p.province))).sort();
  
  const options = [
    ...regions,
    ...(showProvinces ? provinces.map(p => ({ value: p, label: p })) : [])
  ];

  const selectedOption = options.find(o => o.value === selectedProvince) || options[0];

  return (
    <div className="relative">
      <select
        value={selectedProvince}
        onChange={(e) => setSelectedProvince(e.target.value)}
        className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2.5 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
    </div>
  );
};

export default ProvinceSelector;
