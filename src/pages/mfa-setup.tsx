// import { useState, useEffect } from 'react';
// import { useRouter } from 'next/router';
// import { useAuth } from '@/components/auth/AuthContext';
// import Head from 'next/head';
// import { showError, showSuccess } from '@/lib/utils/notification';
// import { QRCodeSVG } from 'qrcode.react';
// import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';
// import { cognitoConfig } from '@/lib/config/cognito';
// import toast from 'react-hot-toast';

// export default function MfaSetup() {
//   const [setupData, setSetupData] = useState<{ qrCodeUrl?: string }>({});
//   const [totpCode, setTotpCode] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [showContent, setShowContent] = useState(true);
//   const router = useRouter();
//   const { setupTotpMfa, verifyAndEnableTotpMfa } = useAuth();

//   useEffect(() => {
//     const run = async () => {
//       const userPool = new CognitoUserPool({
//         UserPoolId: cognitoConfig.userPoolId,
//         ClientId: cognitoConfig.clientId
//       });
//       let user = userPool.getCurrentUser();
//       // Debug log
//       if (typeof window !== 'undefined') {
//         console.log('mfa-setup: user', user);
//         console.log('mfa-setup: user.getSignInUserSession()', user?.getSignInUserSession());
//         console.log('mfa-setup: localStorage cognito_username', localStorage.getItem('cognito_username'));
//         console.log('mfa-setup: localStorage cognito_password', localStorage.getItem('cognito_password'));
//         console.log('mfa-setup: localStorage cognito_challenge_session', localStorage.getItem('cognito_challenge_session'));
//       }
//       // 若 user 為 null，嘗試從 localStorage 還原 CognitoUser 實例
//       if (!user && typeof window !== 'undefined') {
//         const username = localStorage.getItem('cognito_username');
//         const challengeSession = localStorage.getItem('cognito_challenge_session');
//         if (username && challengeSession) {
//           localStorage.setItem(
//             `CognitoIdentityServiceProvider.${cognitoConfig.clientId}.LastAuthUser`,
//             username
//           );
//           user = new CognitoUser({
//             Username: username,
//             Pool: userPool
//           });
//           // 關鍵：還原 challengeName
//           try {
//             const sessionInfo = JSON.parse(challengeSession);
//             if (sessionInfo.challengeName) {
//               user.challengeName = sessionInfo.challengeName;
//             }
//             if (sessionInfo.authenticationFlowType) {
//               user.setAuthenticationFlowType(sessionInfo.authenticationFlowType);
//             }
//           } catch (e) {}
//         }
//       }
//       // 進階修正：若 session 為 null，主動 signIn
//       if (!user || !user.getSignInUserSession()) {
//         const username = localStorage.getItem('cognito_username');
//         const password = localStorage.getItem('cognito_password');
//         if (username && password) {
//           const authDetails = new AuthenticationDetails({ Username: username, Password: password });
//           user = new CognitoUser({ Username: username, Pool: userPool });
//           try {
//             await new Promise((resolve, reject) => {
//               user!.authenticateUser(authDetails, {
//                 onSuccess: () => resolve(true),
//                 onFailure: (err) => reject(err),
//                 newPasswordRequired: () => reject(new Error('新密碼流程異常，請重新登入')),
//                 mfaSetup: () => resolve(true)
//               });
//             });
//           } catch (err) {
//             toast.dismiss();
//             setShowContent(false);
//             showError('您的登入狀態已失效，請重新登入後再設置 MFA');
//             setTimeout(() => {
//               router.replace('/login');
//             }, 1500);
//             return;
//           }
//         } else {
//           toast.dismiss();
//           setShowContent(false);
//           showError('您的登入狀態已失效，請重新登入後再設置 MFA');
//           setTimeout(() => {
//             router.replace('/login');
//           }, 1500);
//           return;
//         }
//       }
//       if (!user) return;
//       setLoading(true);
//       try {
//         const username = localStorage.getItem('cognito_username');
//         const password = localStorage.getItem('cognito_password');
//         // 若 CognitoUser 還在 NEW_PASSWORD_REQUIRED 狀態，則自動 completeNewPasswordChallenge
//         if (user && user['challengeName'] === 'NEW_PASSWORD_REQUIRED' && password) {
//           await new Promise((resolve, reject) => {
//             user.completeNewPasswordChallenge(password, {}, {
//               onSuccess: () => resolve(true),
//               onFailure: (err) => reject(err),
//               mfaSetup: () => resolve(true)
//             });
//           });
//         }
//         // 取得 session 後再呼叫 setupTotpMfa
//         const result = await setupTotpMfa();
//         if (result.success && result.qrCodeUrl) {
//           setSetupData({ qrCodeUrl: result.qrCodeUrl });
//         } else {
//           showError('無法產生 QRCode，請稍後再試');
//         }
//       } catch (err) {
//         showError('MFA 設置流程失敗: ' + (err instanceof Error ? err.message : '未知錯誤'));
//         setTimeout(() => {
//           router.replace('/login');
//         }, 1500);
//       }
//       setLoading(false);
//     };
//     run();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   // 強制清除 cognito_new_password_required，避免被 ProtectedRoute 誤判
//   useEffect(() => {
//     if (typeof window !== 'undefined') {
//       localStorage.removeItem('cognito_new_password_required');
//     }
//   }, []);

//   const handleVerify = async () => {
//     if (!totpCode) {
//       showError('請輸入驗證碼');
//       return;
//     }
//     setLoading(true);
//     const success = await verifyAndEnableTotpMfa(totpCode);
//     setLoading(false);
//     if (success) {
//       showSuccess('TOTP MFA 已成功啟用，將自動跳轉首頁');
//       setTimeout(() => {
//         router.push('/');
//       }, 1200);
//     } else {
//       showError('驗證失敗，請確認驗證碼正確且未過期');
//     }
//   };

//   if (!showContent) {
//     return (
//       <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f5f5f5'}}>
//         <div style={{fontSize: '1.2rem', color: '#888'}}>載入中...</div>
//       </div>
//     );
//   }

//   return (
//     <>
//       <Head>
//         <title>設置驗證器應用 (TOTP) | Hilton AppStream</title>
//         <meta name="description" content="設置多因素認證以增強帳戶安全性" />
//       </Head>
//       <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f5f5 60%, #e3e0ff 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem 1rem' }}>
//         <div style={{ width: '100%', maxWidth: '420px', background: 'white', borderRadius: '16px', boxShadow: '0 4px 24px rgba(80, 80, 160, 0.10)', padding: '2.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
//           <div>
//             <h1 style={{ fontSize: '1.7rem', fontWeight: 700, marginBottom: '0.5rem', color: '#222' }}>設置驗證器 App MFA</h1>
//             <p style={{ color: '#444', fontSize: '1rem', marginBottom: '1.5rem' }}>請使用驗證器 App 掃描 QR code，並輸入 App 產生的 6 位數驗證碼完成 MFA 設定。</p>
//           </div>
//           <div style={{ borderTop: '1px solid #eee', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
//             <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
//               <div style={{ flex: 1 }}>
//                 <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>1. 安裝驗證器 App</div>
//                 <div style={{ color: '#666', fontSize: '0.98rem' }}>請於手機安裝 Google Authenticator、Microsoft Authenticator 或 Authy。</div>
//               </div>
//               <div style={{ width: 56, height: 56, background: '#f5f5fa', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
//                 <svg width="32" height="32" fill="none" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#e3e0ff"/><rect x="6" y="4" width="12" height="16" rx="3" fill="#fff" stroke="#888" strokeWidth="1.2"/><rect x="9" y="7" width="6" height="1.5" rx="0.75" fill="#e3e0ff"/><rect x="9" y="10" width="6" height="1.5" rx="0.75" fill="#e3e0ff"/><rect x="9" y="13" width="6" height="1.5" rx="0.75" fill="#e3e0ff"/></svg>
//               </div>
//             </div>
//             <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
//               <div style={{ flex: 1 }}>
//                 <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>2. 掃描 QR code</div>
//                 <div style={{ color: '#666', fontSize: '0.98rem' }}>請用驗證器 App 掃描右方 QR code。</div>
//               </div>
//               <div style={{ width: 120, height: 120, background: '#f5f5fa', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #eee' }}>
//                 {setupData.qrCodeUrl ? (
//                   <QRCodeSVG value={setupData.qrCodeUrl} size={100} level="H" includeMargin={true} />
//                 ) : (
//                   <span style={{ color: '#aaa', fontSize: '0.9rem' }}>加載中...</span>
//                 )}
//               </div>
//             </div>
//             <div>
//               <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>3. 輸入驗證碼</div>
//               <input type="text" value={totpCode} onChange={e => setTotpCode(e.target.value)} style={{ width: '100%', padding: '0.85rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1.1rem', marginTop: '0.5rem', letterSpacing: '0.2em', textAlign: 'center' }} placeholder="請輸入 6 位數驗證碼" maxLength={6} disabled={loading} />
//             </div>
//           </div>
//           <button type="button" onClick={handleVerify} style={{ width: '100%', padding: '0.95rem', backgroundColor: '#1976d2', color: 'white', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontSize: '1.1rem', fontWeight: 'bold', marginTop: '0.5rem', marginBottom: '0.5rem', letterSpacing: '0.05em' }} disabled={!totpCode || loading}>
//             {loading ? '驗證中...' : '啟用 MFA'}
//           </button>
//           <button type="button" onClick={() => router.push('/login')} style={{ width: '100%', padding: '0.85rem', backgroundColor: '#f5f5f5', color: '#666', border: '1px solid #ccc', borderRadius: '6px', fontSize: '1rem', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }} disabled={loading}>
//             返回登入
//           </button>
//         </div>
//       </div>
//     </>
//   );
// } 