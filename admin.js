// Configuración de Supabase
const SUPABASE_URL = 'https://rynwdfswwrbhuskdcdut.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5bndkZnN3d3JiaHVza2RjZHV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NTkyMzIsImV4cCI6MjA4MjIzNTIzMn0.-OV50aPppSm6aJ-UA1Myf4HTGBrVrAWUzNAUPUZjk80';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Verificar auth al cargar
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        window.location.href = 'index.html';
        return;
    }

    // Verificar si es admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

    if (!profile || profile.role !== 'admin') {
        alert('Acceso denegado');
        window.location.href = 'dashboard.html';
        return;
    }

    loadPendingTransactions();
});

async function loadPendingTransactions() {
    const container = document.getElementById('pendingTransactions');

    try {
        // Obtener transacciones pendientes
        // Necesitamos unir con profile para obtener el email (Supabase no permite joins fáciles con auth.users en client SDK, 
        // pero podemos usar profiles si replicamos el email ahí o hacemos 2 queries)
        // En mi schema puse email en profiles.

        const { data: transactions, error } = await supabase
            .from('transactions')
            .select(`
    *,
    profiles: user_id(email)
        `)
            .eq('status', 'pending_verification')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!transactions || transactions.length === 0) {
            container.innerHTML = '<p>No hay transacciones pendientes de revisión.</p>';
            return;
        }

        let html = '';
        transactions.forEach(tx => {
            const date = new Date(tx.created_at).toLocaleString();

            // Obtener URL de la imagen
            const { data: { publicUrl } } = supabase.storage
                .from('payment_proofs')
                .getPublicUrl(tx.payment_proof);

            html += `
        < div class="tx-card" id = "tx-${tx.id}" >
                    <div class="tx-info">
                        <h3>Transacción #${tx.id}</h3>
                        <p><strong>Usuario:</strong> ${tx.profiles?.email || 'Desconocido'}</p>
                        <p><strong>Monto:</strong> $${tx.usd_value} (${tx.amount} ${tx.crypto_type?.toUpperCase()})</p>
                        <p><strong>Fecha:</strong> ${date}</p>
                        <p><strong>Hash/Ref:</strong> ${tx.tx_hash || 'N/A'}</p>
                        
                        <div class="actions">
                            <button onclick="verifyTransaction(${tx.id}, 'approve', '${tx.user_id}', ${tx.usd_value})" class="btn-approve">Aprobar</button>
                            <button onclick="verifyTransaction(${tx.id}, 'reject', null, 0)" class="btn-reject">Rechazar</button>
                        </div>
                    </div>
                    <div>
                        <p><strong>Comprobante:</strong></p>
                        <img src="${publicUrl}" 
                             class="tx-image" 
                             onclick="showImage(this.src)"
                             alt="Comprobante de pago">
                    </div>
                </div >
    `;
        });

        container.innerHTML = html;

    } catch (error) {
        console.error(error);
        container.innerHTML = '<p>Error al cargar transacciones.</p>';
    }
}

async function verifyTransaction(id, action, userId, amount) {
    if (!confirm(`¿Estás seguro de ${action === 'approve' ? 'APROBAR' : 'RECHAZAR'} esta transacción ? `)) return;

    try {
        const newStatus = action === 'approve' ? 'active' : 'rejected';

        // 1. Actualizar estado transacción
        const { error: txError } = await supabase
            .from('transactions')
            .update({
                status: newStatus,
                unlock_date: action === 'approve' ? new Date(Date.now() + 40 * 24 * 60 * 60 * 1000).toISOString() : null
            })
            .eq('id', id);

        if (txError) throw txError;

        // 2. Si es aprobada, verificar referidos y dar bono
        if (action === 'approve' && userId) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('referrer_id')
                .eq('id', userId)
                .single();

            if (profile && profile.referrer_id) {
                // Calcular bono 5%
                const bonus = amount * 0.05;

                await supabase
                    .from('referral_bonuses')
                    .insert({
                        referrer_id: profile.referrer_id,
                        referred_user_id: userId,
                        amount: bonus
                    });
            }
        }

        alert(`Transacción ${action === 'approve' ? 'aprobada' : 'rechazada'} exitosamente.`);
        document.getElementById(`tx - ${id} `).remove();

        if (document.querySelectorAll('.tx-card').length === 0) {
            document.getElementById('pendingTransactions').innerHTML = '<p>No hay transacciones pendientes de revisión.</p>';
        }

    } catch (error) {
        console.error(error);
        alert('Error al procesar solicitud: ' + error.message);
    }
}

function showImage(src) {
    const modal = document.getElementById('imageModal');
    const img = document.getElementById('fullImage');
    img.src = src;
    modal.style.display = 'flex';
}

function closeImageModal() {
    document.getElementById('imageModal').style.display = 'none';
}

function logout() {
    supabase.auth.signOut().then(() => {
        window.location.href = 'index.html';
    });
}

// Cerrar modal con escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeImageModal();
});

