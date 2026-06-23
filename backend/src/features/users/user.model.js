
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: 'Custom user ID provided during creation'
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Null until user sets password on first login'
    },
    department_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'departments',
        key: 'id'
      }
    },
    position: {
      type: DataTypes.ENUM('admin', 'user'),
      defaultValue: 'user'
    },
    joining_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    date_of_birth: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    emergency_contact: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    bank_account_number: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    ifsc_code: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    pan_number: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true
    },
    aadhar_number: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    is_first_login: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Indicates if user needs to set password'
    }
  }, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true
  });

  User.associate = (models) => {
    User.belongsTo(models.Department, {
      foreignKey: 'department_id',
      as: 'department'
    });
  };

  return User;
};