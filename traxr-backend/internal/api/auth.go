package api

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type authRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Name     string `json:"name"`
	Password string `json:"password" binding:"required,min=8"`
}

func (h *Handler) Register(c *gin.Context) {
	var req authRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}

	name := req.Name
	if strings.TrimSpace(name) == "" {
		name = strings.Split(req.Email, "@")[0]
	}

	var userID string
	err = h.DB.QueryRow(c.Request.Context(), "INSERT INTO users (email, name, password) VALUES ($1, $2, $3) RETURNING id", strings.ToLower(req.Email), name, string(hash)).Scan(&userID)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "user already exists"})
		return
	}

	token, err := h.generateJWT(userID, strings.ToLower(req.Email))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to issue token"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"token": token,
		"user": gin.H{
			"id":    userID,
			"email": strings.ToLower(req.Email),
			"name":  name,
		},
	})
}

func (h *Handler) Login(c *gin.Context) {
	var req authRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var userID, email, name, passwordHash string
	err := h.DB.QueryRow(c.Request.Context(), "SELECT id, email, name, password FROM users WHERE email = $1", strings.ToLower(req.Email)).
		Scan(&userID, &email, &name, &passwordHash)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	token, err := h.generateJWT(userID, email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to issue token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user": gin.H{
			"id":    userID,
			"email": email,
			"name":  name,
		},
	})
}

func (h *Handler) JWTMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing bearer token"})
			return
		}

		tokenString := strings.TrimPrefix(header, "Bearer ")
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return []byte(h.Config.JWTSecret), nil
		})
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token claims"})
			return
		}

		userID, _ := claims["sub"].(string)
		c.Set("user_id", userID)
		c.Next()
	}
}

func (h *Handler) generateJWT(userID string, email string) (string, error) {
	claims := jwt.MapClaims{
		"sub":   userID,
		"email": email,
		"exp":   time.Now().Add(24 * time.Hour).Unix(),
		"iat":   time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(h.Config.JWTSecret))
}
