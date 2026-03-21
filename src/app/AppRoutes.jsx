import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import {
    AboutPage,
    AdminPage,
    BoardPage,
    FeedbackPage,
    FreeTrialPage,
    GalleryPage,
    HistoryPage,
    LandingPage,
    LegalPages,
    NotFound,
    PricingPage
} from './appPages';

export function AppRoutes({
    user,
    boardsList,
    onCreateBoard,
    onSelectBoard,
    onDeleteBoard,
    onRestoreBoard,
    onPermanentlyDeleteBoard,
    onUpdateBoardMetadata,
    onLogin,
    onLogout,
    onUpdateBoardTitle,
    onBack
}) {
    return (
        <Routes>
            <Route path="/" element={user ? <Navigate to="/gallery" replace /> : <LandingPage />} />
            <Route path="/intro" element={<LandingPage />} />
            <Route path="/free-trial" element={<FreeTrialPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/legal/tokushoho" element={<LegalPages.Tokushoho />} />
            <Route path="/legal/privacy" element={<LegalPages.Privacy />} />
            <Route path="/legal/terms" element={<LegalPages.Terms />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route
                path="/gallery/*"
                element={(
                    <GalleryPage
                        boardsList={boardsList}
                        onCreateBoard={onCreateBoard}
                        onSelectBoard={onSelectBoard}
                        onDeleteBoard={onDeleteBoard}
                        onRestoreBoard={onRestoreBoard}
                        onPermanentlyDeleteBoard={onPermanentlyDeleteBoard}
                        onUpdateBoardMetadata={onUpdateBoardMetadata}
                        user={user}
                        onLogin={onLogin}
                        onLogout={onLogout}
                    />
                )}
            />
            <Route
                path="/board/:id"
                element={(
                    <BoardPage
                        user={user}
                        boardsList={boardsList}
                        onUpdateBoardTitle={onUpdateBoardTitle}
                        onUpdateBoardMetadata={onUpdateBoardMetadata}
                        onBack={onBack}
                    />
                )}
            />
            <Route
                path="/board/:id/note/:noteId"
                element={(
                    <BoardPage
                        user={user}
                        boardsList={boardsList}
                        onUpdateBoardTitle={onUpdateBoardTitle}
                        onUpdateBoardMetadata={onUpdateBoardMetadata}
                        onBack={onBack}
                    />
                )}
            />
            <Route path="/feedback" element={<FeedbackPage />} />
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
}
