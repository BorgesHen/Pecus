export function PopupErro({ mensagem, onFechar }: { mensagem: string; onFechar: () => void }) {
  return (
    <div className="modal-overlay" onClick={onFechar}>
      <div className="modal popup-alerta" onClick={(e) => e.stopPropagation()}>
        <div className="popup-icone popup-icone--aviso">!</div>
        <h3>Já existe um cadastro com estes dados</h3>
        <p className="erro" style={{ marginBottom: 20 }}>
          {mensagem}
        </p>
        <div className="modal-acoes" style={{ justifyContent: 'center' }}>
          <button className="btn" onClick={onFechar}>
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
