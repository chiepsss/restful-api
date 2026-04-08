import { MOVIE_CONSTRAINTS } from '../constants/movie';

export const validateMovieFields = (
    fields: Partial<{ title: string; director: string }>,
    requireAll = false
): string[] => {
    const errors: string[] = [];
    const { title, director } = fields;

    if (requireAll && !title?.trim()) errors.push('title is required');
    if (requireAll && !director?.trim()) errors.push('director is required');

    if (title !== undefined) {
        const trimmed = title.trim();
        if (!trimmed && !requireAll) errors.push('title cannot be empty');
        if (trimmed.length > MOVIE_CONSTRAINTS.title.maxLength) {
            errors.push(`title must not exceed ${MOVIE_CONSTRAINTS.title.maxLength} characters`);
        }
    }

    if (director !== undefined) {
        const trimmed = director.trim();
        if (!trimmed && !requireAll) errors.push('director cannot be empty');
        if (trimmed.length > MOVIE_CONSTRAINTS.director.maxLength) {
            errors.push(`director must not exceed ${MOVIE_CONSTRAINTS.director.maxLength} characters`);
        }
    }

    return errors;
};