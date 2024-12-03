const sqlite3 = require('sqlite3').verbose();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const bcrypt = require('bcrypt');

const corsOptions = {
  origin: 'http://127.0.0.1:5500', // Substitua pela URL correta do frontend
  methods: ['GET', 'POST', 'DELETE'], // Adicione DELETE
  allowedHeaders: ['Content-Type'],
};

app.use(cors(corsOptions));

app.use(bodyParser.json());

// Conectar ao banco de dados SQLite
const db = new sqlite3.Database('./dbcgbr.db', (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err.message);
  } else {
    console.log('Conectado ao banco de dados!');
  }
});

// Rota para obter produtos do banco de dados
app.get('/produtos', (req, res) => {
  const selectQuery = 'SELECT * FROM produtos';

  db.all(selectQuery, [], (err, rows) => {
    if (err) {
      console.error('Erro ao consultar dados:', err.message);
      return res.status(500).json({ error: err.message });
    }

    res.json(rows);
  });
});

//cadastra um novo produto
app.post('/produtos', (req, res) => {
  const { nome, modelo, cor, marca, imagem, preco, descricao } = req.body;  

  // Inserir os dados no banco de dados
  const insertQuery = 'INSERT INTO produtos (nome, modelo, cor, marca, imagem, descricao, preco) VALUES (?, ?, ?, ?, ?, ?, ?)';

  db.run(insertQuery, [nome, modelo, cor, marca, imagem, descricao, preco], function(err) {
    if (err) {
      console.error('Erro ao inserir dados:', err.message);
      return res.status(500).json({ error: err.message });
    }

    res.status(201).json({ message: 'Produto cadastrado com sucesso!', id: this.lastID });
  });
});

app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});

// Fechar a conexão com o banco de dados quando o servidor for encerrado
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Erro ao fechar o banco de dados:', err.message);
    } else {
      console.log('Conexão com o banco de dados fechada!');
    }
    process.exit();
  });
});
// Adiciona o produto ao carrinho no banco de dados
app.post('/carrinho', (req, res) => {
  const { id, nome, preco, quantidade } = req.body;

  const sql = `
      INSERT INTO carrinho (id_produto, nome, preco, quantidade)
      VALUES (?, ?, ?, ?)
  `;

  db.run(sql, [id, nome, preco, quantidade], function (err) {
      if (err) {
          console.error(err);
          res.status(500).json({ error: 'Erro ao adicionar ao carrinho' });
      } else {
          res.status(200).json({ message: 'Produto adicionado ao carrinho com sucesso' });
      }
  });
});

app.get('/carrinho', (req, res) => {
  const sql = `SELECT * FROM carrinho`;

  db.all(sql, [], (err, rows) => {
      if (err) {
          console.error(err);
          res.status(500).json({ error: 'Erro ao buscar os produtos do carrinho' });
      } else {
          res.status(200).json(rows);
      }
  });
});
app.delete('/carrinho/:id', async (req, res) => {
  const { id } = req.params;
  try {
      const result = await db.run('DELETE FROM carrinho WHERE id = ?', [id]);
      if (result.changes > 0) {
          res.status(200).send('Produto removido com sucesso.');
      } else {
          res.status(404).send('Produto não encontrado.');
      }
  } catch (error) {
      console.error(error);
      res.status(500).send('Erro ao remover o produto.');
  }
});
// envia os clientes pro front end
app.get('/cliente', (req, res) => {
  const sql = `SELECT * FROM clientes`;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar clientes:', err.message);
      return res.status(500).json({ error: 'Erro ao buscar clientes' });
    }
    var rtrncln = rows
    res.status(200).json(rows);
    
  });
});
// cadastra o cliente no banco de dados
app.post('/cliente', async (req, res) => {
  const { nome, senha } = req.body; 
  try { 
    const sqlCheck = `SELECT * FROM clientes WHERE nome = ?`;

    db.get(sqlCheck, [nome], async (err, row) => {
      if (err) {
        console.error('Erro ao verificar cliente:', err.message);
        return res.status(500).json({ error: 'Erro ao verificar cliente no banco de dados.' });
      }

      if (row) {
        // Cliente já existe
        return res.status(200).json({
          exists: true,
          message: 'Cliente já cadastrado.',
        });
      }

      const saltRounds = 6;
      const hashedPassword = await bcrypt.hash(senha, saltRounds);

      const sqlInsert = `INSERT INTO clientes (nome, senha) VALUES (?, ?)`;

      db.run(sqlInsert, [nome, hashedPassword], function (err) {
        if (err) {
          console.error('Erro ao inserir cliente:', err.message);
          return res.status(500).json({ error: 'Erro ao adicionar cliente ao banco de dados.' });
        }

        return res.status(201).json({
          exists: false,
          message: 'Cliente cadastrado com sucesso!',
          id: this.lastID,
        });
      });
    });
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    res.status(500).json({ error: 'Erro ao processar a solicitação.' });
  }
});

// Login do cliente: verifica se a senha está correta
app.post('/login', async (req, res) => {
const { nome, senha } = req.body;

try {
  const sqlCheck = `SELECT * FROM clientes WHERE nome = ?`;

  db.get(sqlCheck, [nome], async (err, row) => {
    if (err) {
      console.error('Erro ao verificar cliente:', err.message);
      return res.status(500).json({ error: 'Erro ao verificar cliente no banco de dados.' });
    }

    if (!row) {
      // Cliente não encontrado
      return res.status(404).json({
        message: 'Cliente não encontrado.',
      });
    }

    // Verificar a senha usando bcrypt
    const isPasswordValid = await bcrypt.compare(senha, row.senha);

    if (isPasswordValid) {
      // Senha correta, login bem-sucedido
      return res.status(200).json({
        message: 'Login bem-sucedido!',
        cliente: {
          id: row.id,
          nome: row.nome,
        },
      });
    } else {
      // Senha incorreta
      return res.status(401).json({
        message: 'Senha inválida.',
      });
    }
  });
} catch (error) {
  console.error('Erro ao processar requisição:', error);
  res.status(500).json({ error: 'Erro ao processar a solicitação.' });
}
});
