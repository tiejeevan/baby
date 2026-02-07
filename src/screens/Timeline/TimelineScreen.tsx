import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { dbHelpers } from '../../services/database';
import type { Milestone, MilestoneType } from '../../types';
import './TimelineScreen.css';

const TimelineScreen: React.FC = () => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);

    const milestones = useLiveQuery(() => dbHelpers.getMilestones());

    const handleAddMilestone = () => {
        setEditingMilestone(null);
        setShowAddForm(true);
    };

    const handleEditMilestone = (milestone: Milestone) => {
        setEditingMilestone(milestone);
        setShowAddForm(true);
    };

    const handleDeleteMilestone = async (id: number) => {
        if (confirm('Are you sure you want to delete this milestone?')) {
            await dbHelpers.deleteMilestone(id);
        }
    };

    const getMilestoneIcon = (type: MilestoneType): string => {
        switch (type) {
            case 'first_test':
                return '🎉';
            case 'hospital_visit':
                return '🏥';
            case 'ultrasound':
                return '👶';
            case 'custom':
                return '⭐';
            default:
                return '📌';
        }
    };

    const getMilestoneTypeLabel = (type: MilestoneType): string => {
        switch (type) {
            case 'first_test':
                return 'First Positive Test';
            case 'hospital_visit':
                return 'Hospital Visit';
            case 'ultrasound':
                return 'Ultrasound';
            case 'custom':
                return 'Custom Milestone';
            default:
                return 'Milestone';
        }
    };

    return (
        <div className="timeline-screen">
            <div className="timeline-header">
                <h1>Your Journey</h1>
                <button className="btn-primary" onClick={handleAddMilestone}>
                    + Add Milestone
                </button>
            </div>

            {milestones && milestones.length > 0 ? (
                <div className="timeline-container">
                    {milestones.map((milestone, index) => (
                        <div key={milestone.id} className="milestone-card" style={{ animationDelay: `${index * 0.1}s` }}>
                            <div className="milestone-icon">
                                {getMilestoneIcon(milestone.type)}
                            </div>
                            <div className="milestone-content">
                                <div className="milestone-header">
                                    <div>
                                        <h3>{milestone.title}</h3>
                                        <p className="milestone-type">{getMilestoneTypeLabel(milestone.type)}</p>
                                    </div>
                                    <div className="milestone-actions">
                                        <button
                                            className="icon-button"
                                            onClick={() => handleEditMilestone(milestone)}
                                            title="Edit"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            className="icon-button"
                                            onClick={() => milestone.id && handleDeleteMilestone(milestone.id)}
                                            title="Delete"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                                <p className="milestone-date">
                                    {new Date(milestone.date).toLocaleDateString('en-US', {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric',
                                    })}
                                </p>
                                {milestone.notes && (
                                    <p className="milestone-notes">{milestone.notes}</p>
                                )}
                                {milestone.photoIds.length > 0 && (
                                    <div className="milestone-photos">
                                        <div className="photo-count">
                                            📷 {milestone.photoIds.length} {milestone.photoIds.length === 1 ? 'photo' : 'photos'}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <div className="empty-icon">📖</div>
                    <h2>No milestones yet</h2>
                    <p>Start documenting your pregnancy journey by adding your first milestone!</p>
                    <button className="btn-primary" onClick={handleAddMilestone}>
                        Add Your First Milestone
                    </button>
                </div>
            )}

            {showAddForm && (
                <MilestoneForm
                    milestone={editingMilestone}
                    onClose={() => setShowAddForm(false)}
                />
            )}
        </div>
    );
};

interface MilestoneFormProps {
    milestone: Milestone | null;
    onClose: () => void;
}

const MilestoneForm: React.FC<MilestoneFormProps> = ({ milestone, onClose }) => {
    const [formData, setFormData] = useState({
        type: milestone?.type || 'custom' as MilestoneType,
        title: milestone?.title || '',
        date: milestone?.date || new Date().toISOString().split('T')[0],
        notes: milestone?.notes || '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const milestoneData = {
            ...formData,
            photoIds: milestone?.photoIds || [],
            createdAt: milestone?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        if (milestone?.id) {
            await dbHelpers.updateMilestone(milestone.id, milestoneData);
        } else {
            await dbHelpers.addMilestone(milestoneData);
        }

        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{milestone ? 'Edit Milestone' : 'Add Milestone'}</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Type</label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value as MilestoneType })}
                            required
                        >
                            <option value="first_test">First Positive Test</option>
                            <option value="hospital_visit">Hospital Visit</option>
                            <option value="ultrasound">Ultrasound</option>
                            <option value="custom">Custom</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Title</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g., First ultrasound"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Date</label>
                        <input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Notes (optional)</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Add any notes or memories..."
                            rows={4}
                        />
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary">
                            {milestone ? 'Update' : 'Add'} Milestone
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TimelineScreen;
