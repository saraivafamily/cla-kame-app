import React, { useState } from 'react';
import { User, Camera, X, Heart, MessageCircle, Send, MoreHorizontal, Trash2 } from 'lucide-react';
import { setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getPublicDocPath } from '../utils/firebase';
import { processScreenshot } from '../utils/helpers';

const SocialFeed = ({ currentUser, teams, showToast, posts, onTaskcompleted }) => {
  const [newPost, setNewPost] = useState('');
  const [commentText, setCommentText] = useState({});
  const [postImage, setPostImage] = useState(null);
  const [isPosting, setIsPosting] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null); 
  
  // 🌟 Controle de quais comentários estão expandidos
  const [expandedComments, setExpandedComments] = useState({}); 

  // 1. FUNÇÃO PARA LER E COMPRIMIR A FOTO
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    processScreenshot(file, (base64) => setPostImage(base64));
  };

  // 2. ENVIAR PARA O FIREBASE
  const handlePost = async (e) => {
    e.preventDefault();
    if (!newPost.trim() && !postImage) return;
    setIsPosting(true);
    
    const newP = {
      id: `p_${Date.now()}`,
      authorId: currentUser?.id || 'anon',
      authorName: currentUser?.name || 'Membro do Clã',
      authorPhoto: currentUser?.photoURL || null,
      content: newPost,
      imageUrl: postImage,
      likes: [],
      comments: [],
      timestamp: Date.now()
    };
    
    try {
      await setDoc(getPublicDocPath('feed', newP.id), newP);
      setNewPost('');
      setPostImage(null);
      showToast("Publicado para todo o Clã!", "success");
      
      if (onTaskcompleted) onTaskcompleted('post', 5);
      
    } catch (err) {
      showToast("Erro ao publicar. A imagem pode estar muito pesada.", "error");
    }
    setIsPosting(false);
  };

  const toggleLike = async (postId) => {
    const post = posts.find(p => p.id === postId);
    if(!post) return;
    
    const currentLikes = post.likes || [];
    const hasLiked = currentLikes.includes(currentUser?.id);
    const newLikes = hasLiked ? currentLikes.filter(id => id !== currentUser?.id) : [...currentLikes, currentUser?.id];
    
    await updateDoc(getPublicDocPath('feed', postId), { likes: newLikes });
    
    if (!hasLiked && onTaskcompleted) {
       onTaskcompleted('like', 1);
    }
  };

  // 🛠️ CORREÇÃO: Salvar comentário de forma blindada
  const handleComment = async (postId) => {
    const text = commentText[postId];
    if (!text?.trim()) return;
    
    const post = posts.find(p => p.id === postId);
    if(!post) return;
    
    const newComment = { id: `c_${Date.now()}`, authorId: currentUser?.id || 'anon', authorName: currentUser?.name || 'Membro', text, timestamp: Date.now() };
    
    // Garante que é um array, mesmo em posts antigos
    const currentComments = post.comments || []; 
    
    await updateDoc(getPublicDocPath('feed', postId), { comments: [...currentComments, newComment] });
    
    // Limpa a caixa de texto
    setCommentText(prev => ({ ...prev, [postId]: '' }));
    
    // Expande os comentários automaticamente ao comentar
    setExpandedComments(prev => ({...prev, [postId]: true}));
  };

  const toggleCommentsExpansion = (postId) => {
    setExpandedComments(prev => ({...prev, [postId]: !prev[postId]}));
  };

  const handleDelete = async (postId) => {
    if(window.confirm('Tem certeza que deseja apagar esta publicação?')) {
      await deleteDoc(getPublicDocPath('feed', postId));
      setActiveMenu(null);
      showToast("Publicação apagada.", "success");
    }
  };

  const getUserTeamName = (userId) => {
    if (!userId || userId === 'anon') return '';
    const team = (teams || []).find(t => t.ownerId === userId);
    return team ? team.name : '';
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in pb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black text-white tracking-wide">Feed da Resenha</h2>
      </div>

      <div className="bg-blue-900/60 p-4 sm:p-5 rounded-3xl border border-blue-800/80 mb-8 shadow-xl">
        <div className="flex gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-800 rounded-full flex items-center justify-center overflow-hidden border-2 border-emerald-500/30 shrink-0 shadow-inner">
            {currentUser?.photoURL ? <img src={currentUser.photoURL} alt="Você" className="w-full h-full object-cover"/> : <User size={20} className="text-blue-400"/>}
          </div>
          <form onSubmit={handlePost} className="flex-1 flex flex-col pt-1">
            <textarea 
              value={newPost} 
              onChange={e => setNewPost(e.target.value)} 
              placeholder="O que está acontecendo na arena?" 
              className="w-full bg-transparent text-white placeholder:text-blue-400 text-lg focus:outline-none resize-none min-h-[60px]" 
            />
            
            {postImage && (
              <div className="relative inline-block self-start mt-3 mb-2 group">
                <img src={postImage} alt="Preview" className="max-h-48 rounded-2xl border border-blue-700 shadow-md object-contain bg-black/40" />
                <button type="button" onClick={() => setPostImage(null)} className="absolute top-2 right-2 bg-black/70 hover:bg-red-500 text-white rounded-full p-1.5 backdrop-blur-sm transition-colors"><X size={16}/></button>
              </div>
            )}

            <div className="flex justify-between items-center mt-3 pt-3 border-t border-blue-800/50">
              <label className="cursor-pointer text-emerald-500 hover:bg-emerald-500/10 p-2 rounded-full transition-colors" title="Anexar Imagem">
                <Camera size={20} />
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
              <button type="submit" disabled={(!newPost.trim() && !postImage) || isPosting} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-1.5 px-5 rounded-full transition-all shadow-md flex items-center gap-2">
                {isPosting ? 'Postando...' : 'Postar'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="space-y-5">
        {posts.length === 0 && <p className="text-center text-blue-500 p-8 bg-blue-900/30 rounded-3xl border border-blue-800/50 border-dashed">Nenhuma resenha ainda. Seja o primeiro!</p>}
        {posts.map(post => {
          const currentLikes = post.likes || [];
          const postComments = post.comments || [];
          
          const isLiked = currentLikes.includes(currentUser?.id);
          const isAuthorOrAdmin = post.authorId === currentUser?.id || currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
          const teamName = getUserTeamName(post.authorId);
          
          // Lógica de Visibilidade dos Comentários
          const isExpanded = expandedComments[post.id];
          const visibleComments = isExpanded ? postComments : postComments.slice(0, 3);
          
          return (
            <div key={post.id} className="bg-blue-950/40 rounded-3xl border border-blue-800/60 p-4 sm:p-5 shadow-md hover:border-blue-700 transition-colors">
              
              {/* Header do Post */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-800 rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-blue-700">
                    {post.authorPhoto ? <img src={post.authorPhoto} alt="Foto" className="w-full h-full object-cover"/> : <User size={18} className="text-blue-400"/>}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-white text-sm hover:underline cursor-pointer">{post.authorName}</span>
                      {teamName && <span className="text-[10px] bg-blue-900 text-blue-300 px-1.5 py-0.5 rounded font-medium border border-blue-800">{teamName}</span>}
                    </div>
                    <span className="text-[10px] text-blue-500 font-medium">
                      {new Date(post.timestamp).toLocaleDateString()} às {new Date(post.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                </div>

                {isAuthorOrAdmin && (
                  <div className="relative">
                    <button onClick={() => setActiveMenu(activeMenu === post.id ? null : post.id)} className="text-blue-500 hover:bg-blue-900 p-1.5 rounded-full transition-colors">
                      <MoreHorizontal size={18} />
                    </button>
                    {activeMenu === post.id && (
                      <div className="absolute right-0 mt-1 w-32 bg-blue-900 border border-red-500/30 rounded-xl shadow-xl overflow-hidden z-10 animate-in fade-in zoom-in-95">
                        <button onClick={() => handleDelete(post.id)} className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 font-bold flex items-center gap-2">
                          <Trash2 size={14}/> Apagar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Conteúdo */}
              {post.content && <p className="text-blue-100 mb-3 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">{post.content}</p>}
              
              {post.imageUrl && (
                <div className="mb-4 rounded-2xl overflow-hidden border border-blue-800/80 bg-black/40">
                  <img src={post.imageUrl} alt="Anexo" className="w-full max-h-[500px] object-cover sm:object-contain" loading="lazy" />
                </div>
              )}
              
              {/* 🌟 BOTÕES DE INTERAÇÃO (AGORA O BOTÃO DE COMENTÁRIO FUNCIONA!) */}
              <div className="flex items-center gap-6 pt-2">
                <button onClick={() => toggleLike(post.id)} className={`flex items-center gap-1.5 text-sm font-bold transition-all group ${isLiked ? 'text-red-500' : 'text-blue-400 hover:text-red-400'}`}>
                  <div className={`p-1.5 rounded-full group-hover:bg-red-500/10 transition-colors ${isLiked ? 'bg-red-500/10' : ''}`}>
                    <Heart size={18} className={isLiked ? 'fill-current' : ''} />
                  </div>
                  <span>{currentLikes.length > 0 && currentLikes.length}</span>
                </button>
                
                {/* Botão de abrir caixa de comentários */}
                <button 
                  onClick={() => {
                     // Força a caixa de texto a aparecer
                     if (commentText[post.id] === undefined) {
                       setCommentText(prev => ({...prev, [post.id]: ''}));
                     }
                  }} 
                  className="flex items-center gap-1.5 text-sm font-bold text-blue-400 hover:text-blue-300 group cursor-pointer transition-all"
                >
                  <div className="p-1.5 rounded-full group-hover:bg-blue-500/10 transition-colors">
                    <MessageCircle size={18} />
                  </div>
                  <span>{postComments.length > 0 && postComments.length}</span>
                </button>
              </div>

              {/* Área de Comentários */}
              {(postComments.length > 0 || commentText[post.id] !== undefined) && (
                <div className="mt-4 pt-4 border-t border-blue-800/40 space-y-3">
                  
                  {/* Lista de Comentários Visíveis */}
                  {visibleComments.map(c => {
                    const cTeamName = getUserTeamName(c.authorId);
                    return (
                      <div key={c.id} className="flex gap-2 animate-in fade-in">
                        <div className="w-6 h-6 bg-blue-800 rounded-full flex items-center justify-center shrink-0 mt-0.5"><User size={12} className="text-blue-400"/></div>
                        <div className="bg-blue-900/50 px-3 py-2 rounded-2xl rounded-tl-none border border-blue-800/50">
                          <p className="text-xs font-bold text-emerald-400">
                            {c.authorName} {cTeamName && <span className="text-[9px] text-blue-400 font-medium">({cTeamName})</span>}
                          </p>
                          <p className="text-xs text-blue-100 mt-0.5 leading-snug">{c.text}</p>
                        </div>
                      </div>
                    )
                  })}
                  
                  {/* Botão de Ver Mais Comentários */}
                  {postComments.length > 3 && (
                    <button 
                      onClick={() => toggleCommentsExpansion(post.id)}
                      className="text-xs font-bold text-blue-400 hover:text-emerald-400 flex items-center gap-1 justify-center w-full py-1.5 transition-colors"
                    >
                      {isExpanded ? '▲ Ocultar comentários' : `▼ Ver mais ${postComments.length - 3} comentários`}
                    </button>
                  )}
                  
                  {/* Input de Novo Comentário */}
                  <div className="flex gap-2 mt-2 items-center">
                    <div className="w-6 h-6 bg-blue-800 rounded-full flex items-center justify-center shrink-0"><User size={12} className="text-blue-400"/></div>
                    <input 
                      type="text" 
                      placeholder="Adicione um comentário..." 
                      value={commentText[post.id] || ''} 
                      onChange={e => setCommentText(prev => ({...prev, [post.id]: e.target.value}))} 
                      onKeyDown={e => e.key === 'Enter' && handleComment(post.id)} 
                      className="flex-1 bg-blue-900/50 border border-blue-800 rounded-full px-4 py-1.5 text-xs text-white outline-none focus:border-emerald-500 transition-colors" 
                    />
                    <button 
                      onClick={() => handleComment(post.id)} 
                      disabled={!commentText[post.id]?.trim()} 
                      className="text-emerald-500 disabled:text-blue-700 p-1.5 hover:bg-emerald-500/10 rounded-full transition-colors cursor-pointer"
                    >
                      <Send size={16}/>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SocialFeed;
