export function PopupConfirmacao({
  titulo,
  mensagem,
  textoConfirmar = 'Excluir',
  onConfirmar,
  onCancelar,
}: {
  titulo: string;
  mensagem: string;
  textoConfirmar?: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onCancelar}>
      <div className="modal popup-alerta" onClick={(e) => e.stopPropagation()}>
        <div className="popup-icone popup-icone--pergunta">?</div>
        <h3>{titulo}</h3>
        <p style={{ color: 'var(--texto-suave)', marginBottom: 20 }}>{mensagem}</p>
        <div className="modal-acoes" style={{ justifyContent: 'center' }}>
          <button className="btn-secundario" onClick={onCancelar}>
            Cancelar
          </button>
          <button className="btn-perigo-solido" onClick={onConfirmar}>
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
