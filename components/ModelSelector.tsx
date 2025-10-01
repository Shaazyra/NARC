import React from 'react';
import { ModelOption } from '../constants';

interface ModelSelectorProps {
  models: ModelOption[];
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  isLoading: boolean;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ models, selectedModel, onModelChange, isLoading }) => {
    // Hide selector if there is no real choice to be made.
    if (models.length <= 1) {
        return null;
    }

    const selectedModelDetails = models.find(m => m.id === selectedModel);

    return (
        <div className="mt-3 flex flex-col items-center gap-2">
            <label id="model-select-label" className="text-xs text-slate-400">Pilih Model AI:</label>
            <div className="flex justify-center flex-wrap gap-2" role="radiogroup" aria-labelledby="model-select-label">
                {models.map(model => (
                    <button
                        key={model.id}
                        onClick={() => onModelChange(model.id)}
                        disabled={isLoading}
                        role="radio"
                        aria-checked={selectedModel === model.id}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                            selectedModel === model.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                    >
                        {model.name}
                    </button>
                ))}
            </div>
            {selectedModelDetails && <p className="text-xs text-slate-500 text-center max-w-xs px-2">{selectedModelDetails.description}</p>}
        </div>
    );
};

export default ModelSelector;
